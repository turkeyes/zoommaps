const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  workerId: String,
  dataset: String,
  key: String,
  // survey answers for questions which are always included
  gender: String,
  ageGroup: String,
  ethnicity: [String],
  education: String,
  feedback: String,
  zoomUse: String,
  // answers to questions added by dataset
  endAnswers: mongoose.Schema.Types.Mixed,
  groupAnswers: mongoose.Schema.Types.Mixed
});

const User = mongoose.model("User", userSchema);

module.exports = User;
