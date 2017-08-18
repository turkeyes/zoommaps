var mongoose = require("mongoose");

var labelSchema = mongoose.Schema({
  src: String,
  x_min: [Number],
  id: String
});

var Label = mongoose.model("Label", labelSchema);

module.exports = Label;
