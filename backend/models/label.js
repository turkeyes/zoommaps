const mongoose = require("mongoose");

const labelSchema = mongoose.Schema({
  src: String,
  x_min: [Number],
  x_max: [Number],
  y_min: [Number],
  y_max: [Number],
  time: [Number],
  id: String,
  workerId: String,
  dataset: String,
  orientation: String,
  browser: String,
  os: String,
  duration: Number
});

const Label = mongoose.model("Label", labelSchema);

module.exports = Label;
