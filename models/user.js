var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
  workerID: String,
  dataset: String
});

var User = mongoose.model("User", userSchema);

module.exports = User;
