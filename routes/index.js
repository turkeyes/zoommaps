const express = require('express');
const path = require('path');
const MobileDetect = require('mobile-detect');
const url = require('url');
const fs = require('fs');

const Label = require('../models/label');
const User = require('../models/user');

const router = express.Router();

const MIN_EVENTS = 100; // num position changes for label to count as zoom event
const MIN_ZOOM_FRAC = 0.2; // of photos that must be zoomed on
const MIN_TOTAL_TIME = 5 * 60 * 1000; // msec must be spent on experiment (5min)
const MIN_PHOTO_TIME = 2 * 1000; // msec must be spent on each photo (2sec)


const datasetSizeCache = {}; // unchanging and probably small
/**
 * Get the number of photos in the dataset by name
 * Done by reading a local file, but the result is cached
 * @param {string} dataset 
 * @param {(err, numPhotos?: number) => void} f 
 */
function getDatasetSize(dataset, f) {
  if (dataset in datasetSizeCache) return f(null, datasetSizeCache[dataset]);

  const filePath = path.join(__dirname, '..', 'public', 'datasets', `${dataset}.json`);
  fs.readFile(filePath, 'utf8', (readErr, dataStr) => {
    if (readErr) {
      console.log('Error finding dataset');
      f(readErr);
    } else {
      try {
        const data = JSON.parse(dataStr);
        const numPhotos = data.map(o => o.data.length)
          .reduce((a, b) => a + b, 0);
        f(null, numPhotos);
      } catch (parseErr) {
        console.log('Error parsing dataset file.');
        f(parseErr);
      }
    }
  });
}

/**
 * Finds user & labels for given workerID x dataset
 * Creates a user if one does not exist
 * @param {string} workerID
 * @param {string} dataset
 * @param {(err, user?: User, labels?: Label[], numPhotos: number) => void} f - callback
 */
function getUserData(workerID, dataset, f) {
  getDatasetSize(dataset, (getSizeError, numPhotos) => {
    if (getSizeError) return f(getSizeError);

    User.findOne({ workerID, dataset }, (findUserErr, foundUser) => {
      if (findUserErr) {
        console.log('Error finding existing user', findUserErr);
        f(findUserErr);
      } else if (foundUser) {
        Label.find({ workerID, dataset }, (findLabelsErr, labels) => {
          if (findLabelsErr) {
            console.log('Error finding the user labels', findLabelsErr);
            f(findLabelsErr);
          } else {
            f(null, foundUser, labels, numPhotos);
          }
        });
      } else {
        new User({ workerID, dataset }).save((newUserErr, newUser) => {
          if (newUserErr) {
            console.log('Error saving new user', newUserErr);
            f(newUserErr);
          } else {
            f(null, newUser, [], numPhotos);
          }
        });
      }
    });
  });
}

/**
 * Determines whether or not a label represents a zoom event
 * @param {Label} label
 * @return {boolean}
 */
function isZoom(label) {
  const { x_min, x_max, y_min, y_max } = label;
  const longEnough = x_min.length > MIN_EVENTS; // all lengths are equal
  const didMove = [x_min, x_max, y_min, y_max]
    .map(a => new Set(a))
    .map(s => s.size)
    .reduce((a, b) => a + b, 0) > 4;
  return longEnough && didMove;
}

/**
 * Check whether or not the experiment has been completed.
 * @param {Label[]} labels 
 */
function checkDone(labels, numPhotos) {
  const enoughZooms = labels.map(isZoom).length >= numPhotos * MIN_ZOOM_FRAC;

  const times = labels.map(label => label._id.getTimestamp().getTime());
  const startTime = Math.min(...times, 0);
  const endTime = Math.max(...times, 0);
  const enoughTime = endTime - startTime >= MIN_TOTAL_TIME;

  const uniquePhotos = new Set(labels
    .filter(label => label.duration >= MIN_PHOTO_TIME)
    .map(label => label.src)
  );
  const allPhotos = uniquePhotos.size >= numPhotos; // TODO: dynamic from dataset

  return enoughZooms && enoughTime && allPhotos
}

/**
 * Check whether or not the user has completed the survey
 * @param {User} user 
 * @return {boolean}
 */
function checkSurvey(user) {
  return user.gender && user.ageGroup && user.ethnicity && user.education;
}


/**
 * Bad link -- just send the photo view page which will show an error
 */
router.get('/', (req, res) => {
  const { workerID, dataset } = req.query;

  if (!dataset) {
    return res.sendFile(path.join(__dirname, '../views/viewer.html'))
  }
  if (!workerID) {
    return res.sendFile(path.join(__dirname, '../views/enterid.html'));
  }

  getUserData(workerID, dataset, (err, user, labels, numPhotos) => {
    if (err) return res.sendFile(path.join(__dirname, '../views/enterid.html'));

    if (!checkDone(labels, numPhotos)) {
      const md = new MobileDetect(req.headers['user-agent']);
      const notMobile = !(md.mobile() || md.phone() || md.tablet());
      if (notMobile) {
        res.sendFile(path.join(__dirname, '../views/error.html'));
      } else {
        res.sendFile(path.join(__dirname, '../views/viewer.html'));
      }
    } else {
      if (!checkSurvey(user)) {
        res.sendFile(path.join(__dirname, '../views/survey.html'));
      } else {
        res.sendFile(path.join(__dirname, '../views/done.html'));
      }
    }
  });
});

/**
 * experimentdomain/dataset -- convenient for MTurk links
 */
router.get('/:dataset', (req, res) => {
  const { dataset } = req.params;
  res.redirect(url.format({
    pathname: '/',
    query: {
      dataset,
      ...req.query
    }
  }));
});


/**
 * Log a zoom label
 */
router.post('/data', (req, res) => {
  const { x_min, x_max, y_min, y_max, time } = req.body;
  const valid = new Set([x_min, x_max, y_min, y_max, time]
    .map(a => a.length)).size === 1;
  if (valid) {
    const label = new Label({
      src: req.body.src,
      x_min,
      x_max,
      y_min,
      y_max,
      time,
      id: req.body.id,
      workerID: req.body.workerID,
      dataset: req.body.dataset,
      orientation: req.body.orientation,
      browser: req.body.browser,
      os: req.body.os,
      duration: req.body.duration
    });
    label.save((err) => {
      if (err) {
        res.send({ success: false, message: "Can't save label, please try again!" });
      } else {
        res.send({ success: true , message: '' });
      }
    });
  } else {
    res.send(400, 'bad request');
  }
});

/**
 * Send survey data
 */
router.post('/survey', (req, res) => {
  const query = {
    workerID: req.body.workerID,
    dataset: req.body.dataset
  }
  const update = {
    gender: req.body.gender,
    ageGroup: req.body.ageGroup,
    ethnicity: req.body.ethnicity,
    education: req.body.education,
    feedback: req.body.feedback
  };
  User.updateOne(query, update, (err) => {
    if (err) {
      console.log('Error finding existing user', findUserErr);
      res.send({ success: false });
    } else {
      res.send({ success: true });
    }
  });
});

/**
 * Check if the user has completed the experiment, sending a completion key if so
 */
router.post('/end', (req, res) => {
  const { workerID, dataset } = req.body;
  getUserData(workerID, dataset, (err, user, labels, numPhotos) => {
    if (err) {
      return res.send({ success: false, done: false, key: '' });
    }

    const done = checkDone(labels, numPhotos);
    const survey = checkSurvey(user);

    res.send({
      success: true,
      done,
      key: survey ? user._id : '',
    });
  });
});

module.exports = router;
