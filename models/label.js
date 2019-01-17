const mongoose = require("mongoose");

function arraySize(val) {
  return val.length >= 100;
}

const numArray = {
  type: [Number],
  validate: [arraySize, '{PATH} must have at least 100 items']
};

const labelSchema = mongoose.Schema({
  src: String,
  x_min: numArray,
  x_max: numArray,
  y_min: numArray,
  y_max: numArray,
  time: numArray,
  id: String,
  workerID: String,
  dataset: String,
  orientation: String,
  browser: String,
  os: String
});

const Label = mongoose.model("Label", labelSchema);

module.exports = Label;
