const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  workerID: String,
  dataset: String
});

const User = mongoose.model("User", userSchema);

module.exports = User;
