var mongoose = require("mongoose");

var labelSchema = mongoose.Schema({
  src: String,
  x_min: [Number],
  x_max: [Number],
  y_min: [Number],
  y_max: [Number],
  time: [Number],
  id: String,
  workerID: String,
  dataset: String
});

var Label = mongoose.model("Label", labelSchema);

module.exports = Label;
