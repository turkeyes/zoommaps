const express = require('express');
const path = require('path');
const MobileDetect = require('mobile-detect');

const Label = require('../models/label');
const User = require('../models/user');

const router = express.Router();

const MIN_ZOOM = 5;


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
 * Bad link -- just send the photo view page which will show an error
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/viewer.html'));
});

/**
 * Show the photo viewing interface.
 * Shows an error screen if the user is not done and not on mobile.
 * If the user is done, desktop works for easy copying of completion code.
 */
router.get('/:dataset/:workerID', (req, res) => {
  const { workerID, dataset } = req.params;
  getUserData(workerID, dataset, (err, user, labels) => {
    if (err) return res.sendFile(path.join(__dirname, '../views/enterid.html'));

    const md = new MobileDetect(req.headers['user-agent']);
    const notMobile = !(md.mobile() || md.phone() || md.tablet());
    const notDone = labels.length < MIN_ZOOM;
    if (notMobile && notDone) {
      return res.sendFile(path.join(__dirname, '../views/error.html'));
    }

    return res.redirect(`/?dataset=${dataset}&workerID=${workerID}`);
  });
});

/**
 * Ask the user to enter their Worker ID
 */
router.get('/:dataset', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/enterid.html'));
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
    dataset: req.body.dataset
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
    res.send({
      success: !err,
      key: labels.length >= MIN_ZOOM ? user._id : '',
    });
  });
});

module.exports = router;
