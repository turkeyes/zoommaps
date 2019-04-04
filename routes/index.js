const express = require('express');
const debug = require('debug')('zoommaps');
const seedrandom = require('seedrandom');
const randomWords = require('random-words');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');

const Label = require('../models/label');
const User = require('../models/user');

const router = express.Router();

const MIN_EVENTS = 100; // num position changes for label to count as zoom event
const MIN_ZOOM_FRAC = 0.2; // of images that must be zoomed on
const MIN_IMAGE_FRAC = 0.85; // of images that must be viewed for min time

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
 * Read the dataset
 * @param {string} dataset file name (no ext)
 * @param {(err, d: Dataset) => void} f callback
 */
function readDatasetFile(dataset, f) {
  fs.readFile(
    path.join(__dirname, '..', 'datasets', `${dataset}.json`),
    'utf8',
    (readErr, data) => {
      if (readErr) {
        debug('Error reading dataset file', readErr);
      }
      let obj;
      try {
        obj = JSON.parse(data);
      } catch (parseErr) {
        debug('Error parsing dataset file', parseErr);
        return f(parseErr);
      }
      return f(null, obj);
    }
  )
}

/**
 * Read the dataset and perform a random sample
 * @param {string} dataset filename (no ext)
 * @param {string} seed any string to seed random function (worker ID)
 * @param {(err, d: Dataset) => void} f callback
 */
function readDatasetAndSample(dataset, seed, f) {
  readDatasetFile(dataset, (readDatasetErr, data) => {
    if (readDatasetErr) return f(readDatasetErr);
    const rand = seedrandom(seed); // consistent sample per worker
    data.groups = getRandom(data.groups, data.sampleSize, rand);
    data.groups.forEach((group) => {
      group.data = getRandom(group.data, group.sampleSize, rand);
    });
    f(null, data);
  });
}

/**
 * Finds user & labels for given workerId x dataset
 * Creates a user if one does not exist
 * @param {string} workerId
 * @param {string} dataset
 * @param {(err, u?: User, l?: Label[], d: Dataset) => void} f - callback
 */
function getUserData(workerId, dataset, f) {
  readDatasetAndSample(dataset, workerId, (readDatasetErr, datasetDetails) => {
    if (readDatasetErr) return f(readDatasetErr);

    User.findOne({ workerId, dataset }, (findUserErr, foundUser) => {
      if (findUserErr) {
        debug('Error finding existing user', findUserErr);
        f(findUserErr);
      } else if (foundUser) {
        Label.find({ workerId, dataset }, (findLabelsErr, labels) => {
          if (findLabelsErr) {
            debug('Error finding the user labels', findLabelsErr);
            f(findLabelsErr);
          } else {
            f(null, foundUser, labels, datasetDetails);
          }
        });
      } else {
        new User({ workerId, dataset }).save((newUserErr, newUser) => {
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

// TODO: check if group is done

function checkGroupDone(labels, minSecImage, minSecGroup, group) {
  const imagesInGroup = new Set(group.data.map(img => img.src));
  const labelsInGroup = labels.filter(l => imagesInGroup.has(l.src));

  const numZooms = labelsInGroup.filter(isZoom).length;
  const enoughZooms = numZooms >= group.data.length * MIN_ZOOM_FRAC;

  // const times = labelsInGroup.map(l => l._id.getTimestamp().getTime());
  // let timeMsec = 0;
  // if (times.length > 1) {
  //   const startTime = Math.min(...times);
  //   const endTime = Math.max(...times);
  //   timeMsec = endTime - startTime;
  // } else if (times.length === 1) {
  //   timeMsec = labelsInGroup[0].duration;
  // }
  const timeMsec = labelsInGroup.map(l => l.duration)
    .reduce((a, b) => a + b, 0);
  const time = timeMsec / 1000;
  const enoughTime = time >= minSecGroup;

  const uniqueImagesForMinSec = new Set(labelsInGroup
    .filter(l => (l.duration / 1000) >= minSecImage)
    .map(l => l.src)
  );
  const enoughImages = uniqueImagesForMinSec.size >= group.data.length * MIN_IMAGE_FRAC;

  const done = enoughZooms && enoughTime && enoughImages;
  if (!done) {
    debug(`Thresholds (#Images=${group.data.length}): Zoom: ${MIN_ZOOM_FRAC*100}%@${MIN_EVENTS}ev, Group: ${minSecGroup}s, Image: ${MIN_IMAGE_FRAC*100}%@${minSecImage}s`);
    debug(`Values: Zooms: ${numZooms} (${enoughZooms}), Total Time: ${time}s (${enoughTime}), Photos: ${uniqueImagesForMinSec.size} (${enoughImages})`);
  }
  return done;
}

/**
 * Check if each group has been completed
 * @param {Label[]} labels
 * @param {Dataset} param1
 * @return {boolean[]}
 */
function checkEachGroupDone(labels, { minSecImage, minSecGroup, groups }) {
  return groups.map(g => checkGroupDone(labels, minSecImage, minSecGroup, g));
}

/**
 * Check whether or not the experiment has been completed.
 * @param {Label[]} labels
 * @param {Dataset} param1
 * @return {boolean[]}
 */
function checkAllDone(labels, { minSecImage, minSecGroup, groups }) {
  const dones = checkEachGroupDone(labels, { minSecImage, minSecGroup, groups });
  return dones.reduce((b, d) => b && d, true);
}

/**
 * Check whether or not the user has completed the survey
 * @param {User} user 
 * @return {boolean}
 */
function checkSurvey(user) {
  return !!(user.gender && user.ageGroup && user.ethnicity && user.education);
}

// Helpers above
// API below

/**
 * Get a dataset file
 */
router.get('/dataset', (req, res) => {
  const { workerId, dataset } = req.query;
  readDatasetAndSample(dataset, workerId, (readDatasetErr, data) => {
    if (readDatasetErr) return res.status(404).send();
    res.send(data);
  });
});

/**
 * Log a zoom label
 */
router.post('/data', (req, res) => {
  const { workerId, dataset } = req.query;
  const {
    src,
    x_min,
    x_max,
    y_min,
    y_max,
    time,
    orientation,
    browser,
    os,
    duration,
  } = req.body;
  const valid = new Set([x_min, x_max, y_min, y_max, time]
    .map(a => a.length)).size === 1;
  if (valid) {
    const label = new Label({
      src,
      x_min,
      x_max,
      y_min,
      y_max,
      time,
      workerId,
      dataset,
      orientation,
      browser,
      os,
      duration,
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
  const { workerId, dataset } = req.query;
  const defaultQuestions = [
    'gender',
    'ageGroup',
    'ethnicity',
    'education',
    'feedback',
    'zoomUse'
  ];
  const notExtra = _.pick(req.body, defaultQuestions);
  const endAnswers = _.omit(req.body, defaultQuestions);
  const update = {
    ...notExtra,
    endAnswers
  };
  User.findOne({ workerId, dataset }, (findUserErr, user) => {
    if (findUserErr || !user) {
      debug('Error finding existing user', findUserErr);
      res.send({ success: false });
    } else {
      User.updateOne({ _id: user._id }, update, (updateUserErr) => {
        if (updateUserErr) {
          debug('Error updating existing user', updateUserErr);
          res.send({ success: false });
        } else {
          // the id is used to match data with mturk
          res.send({ success: true, id: user._id });
        }
      });
    }
  });
});

/**
 * Send survey data
 */
router.post('/group-survey', (req, res) => {
  const { workerId, dataset } = req.query;
  const {
    values,
    groupIdx
  } = req.body;
  getUserData(workerId, dataset, (err, user, _labels, datasetDetails) => {
    if (err) return res.send({ success: false });

    const groupAnswers = user.groupAnswers || {};
    const { key } = datasetDetails.groups[groupIdx];
    groupAnswers[key] = values;
    User.updateOne({ _id: user._id }, { groupAnswers }, (updateUserErr) => {
      if (updateUserErr) {
        debug('Error updating existing user', updateUserErr);
        res.send({ success: false });
      } else {
        res.send({ success: true });
      }
    });
  });
});

/**
 * Check if the user has completed the group
 * Requires the index of the group (in the user's personally-sampled array) in the query
 */
router.get('/end-group', (req, res) => {
  const { workerId, dataset, groupIdx } = req.query;
  getUserData(workerId, dataset, (err, user, labels, datasetDetails) => {
    if (err) {
      return res.send({ success: false, done: false });
    }

    const { minSecImage, minSecGroup, groups } = datasetDetails;
    const done = checkGroupDone(labels, minSecImage, minSecGroup, groups[groupIdx]);
    res.send({ success: true, completed: done });
  });
});

/**
 * Check if the user has completed the experiment, sending a completion key if so
 */
router.get('/end-task', (req, res) => {
  const { workerId, dataset } = req.query;
  getUserData(workerId, dataset, (err, user, labels, datasetDetails) => {
    if (err) {
      return res.send({ success: false, done: false, key: '' });
    }

    const dones = checkEachGroupDone(labels, datasetDetails);
    const done = dones.reduce((a, b) => a && b, true);
    const survey = checkSurvey(user);
    if (!user.key && done && !survey) {
      const key = randomWords();
      User.updateOne({ _id: user._id }, { key }, (setKeyErr) => {
        if (err) {
          debug('Error saving submit key', setKeyErr);
          res.send({ success: false });
        } else {
          res.send({ success: true, completed: false, key, dones });
        }
      });
    } else {
      res.send({
        success: true,
        dones,
        completed: done && survey,
        key: user.key
      });
    }
  });
});

/**
 * Checks if a submit key corresponds to a valid id for a user that did the task
 */
router.get('/validate', (req, res) => {
  const { key, workerId, dataset } = req.query;
  getUserData(workerId, dataset, (err, user, labels, datasetDetails) => {
    if (
      err
      || user.key !== key
      || !checkAllDone(labels, datasetDetails)
      || checkSurvey(user) // codes are invalid after being used
    ) {
      res.status(200).send(false);
    } else {
      res.status(200).send(true);
    }
  });
});

module.exports = router;
