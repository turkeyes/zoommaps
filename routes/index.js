const express = require('express');
const path = require('path');
const MobileDetect = require('mobile-detect');
const url = require('url');

const Label = require('../models/label');
const User = require('../models/user');

const router = express.Router();

const MIN_ZOOM = 5;
const MIN_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds


/**
 * Finds user & labels for given workerID x dataset
 * Creates a user if one does not exist
 * @param {string} workerID
 * @param {string} dataset
 * @param {(err, user?: User, labels?: Label[]) => void} f - callback
 */
function getUserData(workerID, dataset, f) {
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
          f(null, foundUser, labels);
        }
      });
    } else {
      new User({ workerID, dataset }).save((newUserErr, newUser) => {
        if (newUserErr) {
          console.log('Error saving new user', newUserErr);
          f(newUserErr);
        } else {
          f(null, newUser, []);
        }
      });
    }
  });
}

/**
 * Determines whether or not a label represents a zoom event
 * Note: label arrays are guaranteed to have >= 100 items (checked in schema)
 * @param {Label} label
 * @return {boolean}
 */
function isZoom(label) {
  const x_min = new Set(label.x_min)
  const x_max = new Set(label.x_max);
  const y_min = new Set(label.y_min)
  const y_max = new Set(label.y_max);
  return x_min.size + x_max.size + y_min.size + y_max.size > 4;
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

  getUserData(workerID, dataset, (err, user, labels) => {
    console.log()
    if (err) return res.sendFile(path.join(__dirname, '../views/enterid.html'));

    const md = new MobileDetect(req.headers['user-agent']);
    const notMobile = !(md.mobile() || md.phone() || md.tablet());
    const notDone = labels.length < MIN_ZOOM;
    if (notMobile && notDone) {
      return res.sendFile(path.join(__dirname, '../views/error.html'));
    }

    res.sendFile(path.join(__dirname, '../views/viewer.html'));
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
  const label = new Label({
    src: req.body.src,
    x_min: req.body.x_min,
    x_max: req.body.x_max,
    y_min: req.body.y_min,
    y_max: req.body.y_max,
    time: req.body.time,
    id: req.body.id,
    workerID: req.body.workerID,
    dataset: req.body.dataset,
    orientation: req.body.orientation,
    browser: req.body.browser,
    os: req.body.os
  });
  label.save((err) => {
    if (err) res.send({ success: false, message: "Can't save label, please try again!" });
  });
});

/**
 * Check if the user has completed the experiment, sending a completion key if so
 */
router.post('/end', (req, res) => {
  const { workerID, dataset } = req.body;
  getUserData(workerID, dataset, (err, user, labels) => {
    if (err) {
      return res.send({ success: false, key: '' });
    }

    const enoughZooms = labels.map(isZoom).length >= MIN_ZOOM;

    const times = labels.map(label => label._id.getTimestamp().getTime());
    const startTime = Math.min(...times);
    const endTime = Math.max(...times);
    const enoughTime = endTime - startTime >= MIN_TIME;

    const done = enoughZooms && enoughTime
    res.send({
      success: true,
      key: done ? user._id : '',
    });
  });
});

module.exports = router;
