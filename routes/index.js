var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var ObjectId = require('mongodb').ObjectID;

var Label = require("../models/label");

var router = express.Router();

router.get("/", function(req, res, next) {
    res.sendFile(path.join(__dirname, "../views/index.html"));
});

router.get("/viewer", function(req, res, next) {
    res.sendFile(path.join(__dirname, "../views/viewer.html"));
});

router.get("/viewer/:dataset", function(req, res, next) {
  res.redirect('/viewer/?dataset=' + req.params['dataset']);
})


// send data
router.post("/data", function(req, res, next) {
    var label = new Label({ src:req.body.src, x_min:req.body.x_min, x_max:req.body.x_max, y_min:req.body.y_min, y_max:req.body.y_max, time:req.body.time, id:req.body.id});
    label.save(function(err) {
        if (err) res.send({ success: false, message: "Can't save label, please try again!" });
    });
});

module.exports = router;
