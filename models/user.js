const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  workerID: String,
  dataset: String,
  gender: String,
  ageGroup: String,
  ethnicity: String,
  education: String,
  feedback: String
});

const User = mongoose.model("User", userSchema);

module.exports = User;
