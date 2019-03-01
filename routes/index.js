const express = require('express');
const path = require('path');
const MobileDetect = require('mobile-detect');
const url = require('url');
const debug = require('debug')('zoommaps');
const seedrandom = require('seedrandom');

const Label = require('../models/label');
const User = require('../models/user');
const { readDatasetFile, getDatasetDetails } = require('../utils/read-dataset');

const router = express.Router();

const MIN_EVENTS = 100; // num position changes for label to count as zoom event
const MIN_ZOOM_FRAC = 0.2; // of photos that must be zoomed on
const MIN_PHOTO_FRAC = 0.85; // of photos that must be viewed for min time

/**
 * @typedef Dataset
 * @prop {DataSubset[]} subsets
 * @prop {string[]} extraQuestions
 */

/**
 * @typedef DataSubset
 * @prop {string} name
 * @prop {Image[]} data
 * @prop {number} sampleSize
 * @prop {number} minSecPhoto
 * @prop {number} minSecTotal
 */

/**
 * @typedef Image
 * @prop {string} src
 * @prop {number} w
 * @prop {number} h
 */

/**
 * Sample items randomly from an array
 * Source: Bergi, StackOverflow
 * (altered by me to pass in a random function)
 */
function getRandom(arr, n, rand=Math.random) {
  var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
      var x = Math.floor(rand() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

/**
 * Finds user & labels for given workerID x dataset
 * Creates a user if one does not exist
 * @param {string} workerID
 * @param {string} dataset
 * @param {(err, user?: User, labels?: Label[], numPhotos: number) => void} f - callback
 */
function getUserData(workerID, dataset, f) {
  getDatasetDetails(dataset, (getSizeError, datasetDetails) => {
    if (getSizeError) return f(getSizeError);

    User.findOne({ workerID, dataset }, (findUserErr, foundUser) => {
      if (findUserErr) {
        debug('Error finding existing user', findUserErr);
        f(findUserErr);
      } else if (foundUser) {
        Label.find({ workerID, dataset }, (findLabelsErr, labels) => {
          if (findLabelsErr) {
            debug('Error finding the user labels', findLabelsErr);
            f(findLabelsErr);
          } else {
            f(null, foundUser, labels, datasetDetails);
          }
        });
      } else {
        new User({ workerID, dataset }).save((newUserErr, newUser) => {
          if (newUserErr) {
            debug('Error saving new user', newUserErr);
            f(newUserErr);
          } else {
            f(null, newUser, [], datasetDetails);
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
function checkDone(labels, { numPhotos, minSecPhoto, minSecTotal }) {
  const numZooms = labels.map(isZoom).length;
  const enoughZooms = numZooms >= numPhotos * MIN_ZOOM_FRAC;

  const times = labels.map(label => label._id.getTimestamp().getTime());
  const startTime = Math.min(...times);
  const endTime = Math.max(...times);
  const time = (endTime - startTime) / 1000;
  const enoughTime = time >= minSecTotal;

  const uniquePhotos = new Set(labels
    .filter(label => (label.duration / 1000) >= minSecPhoto)
    .map(label => label.src)
  );
  const enoughPhotos = uniquePhotos.size >= numPhotos * MIN_PHOTO_FRAC; // TODO: dynamic from dataset
  const done = enoughZooms && enoughTime && enoughPhotos;
  if (!done) {
    debug(`Thresholds (#Photos=${numPhotos}): Zoom: ${MIN_ZOOM_FRAC*100}%@${MIN_EVENTS}ev, Task: ${minSecTotal}s, Photo: ${MIN_PHOTO_FRAC*100}%@${minSecPhoto}s`);
    debug(`Values: Zooms: ${numZooms} (${enoughZooms}), Total Time: ${time}s (${enoughTime}), Photos: ${uniquePhotos.size} (${enoughPhotos})`);
  }

  return done;
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
 * Get the task
 */
router.get('/', (req, res) => {
  const { workerID, dataset } = req.query;

  // Bad link -- just send the photo view page which will show an error
  if (!dataset) {
    return res.sendFile(path.join(__dirname, '../views/viewer.html'))
  }

  if (!workerID) {
    return res.sendFile(path.join(__dirname, '../views/enterid.html'));
  }

  getUserData(workerID, dataset, (err, user, labels, datasetDetails) => {
    if (err) return res.sendFile(path.join(__dirname, '../views/enterid.html'));

    if (!checkDone(labels, datasetDetails)) {
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
 * Get a dataset file
 */
router.get('/dataset/:dataset', (req, res) => {
  const { dataset } = req.params;
  const { workerID } = req.query;
  readDatasetFile(dataset, (readDatasetErr, data) => {
    if (readDatasetErr) { return res.status(404).send() }

    if (workerID) {
      data = JSON.parse(JSON.stringify(data)); // deepcopy
      const rand = seedrandom(workerID); // consistent sample per worker
      data.subsets.forEach((subset) => {
        subset.data = getRandom(subset.data, subset.sampleSize, rand);
      });
    }
    res.send(data);
  });
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
    feedback: req.body.feedback,
    zoom: req.body.zoom,
    extraAnswers: req.body.extraAnswers
  };
  User.updateOne(query, update, (findUserErr) => {
    if (findUserErr) {
      debug('Error finding existing user', findUserErr);
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
  getUserData(workerID, dataset, (err, user, labels, datasetDetails) => {
    if (err) {
      return res.send({ success: false, done: false, key: '' });
    }

    const done = checkDone(labels, datasetDetails);
    const survey = checkSurvey(user);

    res.send({
      success: true,
      done,
      key: survey ? user._id : '',
    });
  });
});

module.exports = router;
