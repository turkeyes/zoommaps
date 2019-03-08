const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  workerId: String,
  dataset: String,
  key: String,
  gender: String,
  ageGroup: String,
  ethnicity: [String],
  education: String,
  feedback: String,
  zoomUse: String,
  extraAnswers: [String],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
