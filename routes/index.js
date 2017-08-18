var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
var ObjectId = require('mongodb').ObjectID;

var Label = require("../models/label");

var router = express.Router();

// main page
router.get("/", function(req, res, next) {
    res.sendFile(path.join(__dirname, "../views/index.html"));
});


// send data
router.post("/data", function(req, res, next) {
    var label = new Label({ src: req.body.src, data: req.body.data, id: req.body.id});
    label.save(function(err) {
        if (err) res.send({ success: false, message: "Can't save label, please try again!" });
    });
});

module.exports = router;
