var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var User = require('../models/user');
var ObjectId = require('mongodb').ObjectID;
var MobileDetect = require('mobile-detect');
var fs = require('fs');
var qr = require('qr-image');

var Label = require("../models/label");

var router = express.Router();

router.get('*', function(req, res, next) {
  var md = new MobileDetect(req.headers['user-agent']);
  if (!Boolean(md.mobile() || md.phone() || md.tablet())) {
    res.sendFile(path.join(__dirname, "../views/error.html"));
  } else {
    next();
  }
});

router.get("/", function(req, res, next) {
  res.sendFile(path.join(__dirname, "../views/viewer.html"));
});

router.get("/:dataset/:tag", function(req, res, next) {
  User.findOne({ userId: req.params['tag'] }, function(err, foundUser) {
    if (err) {
      console.log("Error finding existing user", err)
    } else if (foundUser) {
      res.sendFile(path.join(__dirname, "../views/error.html"));
    } else {
      new User({
            userId: req.params['tag'],
            dataset: req.params['dataset']
          }).save((err, saved) => {
            if (err) {
              console.log("Error saving new user", err)
            } else {
            }
          });
      res.redirect('/?dataset=' + req.params['dataset'] + '&tag=' + req.params['tag']);
    }
  })
})

router.get("/:dataset", function(req, res, next) {
  res.sendFile(path.join(__dirname, "../views/enterid.html"));
})

// send data
router.post("/data", function(req, res, next) {
  var label = new Label({ src:req.body.src, x_min:req.body.x_min, x_max:req.body.x_max, y_min:req.body.y_min, y_max:req.body.y_max, time:req.body.time, id:req.body.id, tag:req.body.tag, dataset:req.body.dataset});
  label.save(function(err) {
    if (err) res.send({ success: false, message: "Can't save label, please try again!" });
  });
});

router.post("/verification", function(req, res, next) {
  User.findOne({ userId: req.body.userId }, function(err, foundUser) {
    if (err) {
      console.log("Error finding the user", err)
    }
    res.send({ success: true, key: foundUser._id });
  })
});

module.exports = router;
