var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var ObjectId = require('mongodb').ObjectID;
var MobileDetect = require('mobile-detect');

var Label = require("../models/label");

var router = express.Router();

router.get("/", function(req, res, next) {
    res.sendFile(path.join(__dirname, "../views/viewer.html"));
});

router.get("/:dataset/:tag", function(req, res, next) {
  res.redirect('/?dataset=' + req.params['dataset'] + '&tag=' + req.params['tag']);
})

router.get("/:dataset", function(req, res, next) {
  var md = new MobileDetect(req.headers['user-agent']);
  console.log( md.mobile() );
  console.log( md.phone() );
  console.log( md.tablet() );
  if !(md.mobile() || md.phone() || md.tablet()) {
    res.status(403).send({ success: false, message: "Not on mobile device!" });
  }
  res.redirect('/?dataset=' + req.params['dataset']);
})

// send data
router.post("/data", function(req, res, next) {
    var md = new MobileDetect(req.headers['user-agent']);
    console.log( md.mobile() );
    console.log( md.phone() );
    console.log( md.tablet() );
    if (md.mobile() || md.phone() || md.tablet()) {
      var label = new Label({ src:req.body.src, x_min:req.body.x_min, x_max:req.body.x_max, y_min:req.body.y_min, y_max:req.body.y_max, time:req.body.time, id:req.body.id, tag:req.body.tag, dataset:req.body.dataset});
      label.save(function(err) {
          if (err) res.send({ success: false, message: "Can't save label, please try again!" });
      });
    } else {
      res.status(403).send({ success: false, message: "Not on mobile device!" });
    }
});

module.exports = router;
