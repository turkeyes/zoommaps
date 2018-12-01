var mongoose = require("mongoose");

var userSchema = mongoose.Schema({
  userId: String,
  dataset: String
});

var User = mongoose.model("User", userSchema);

module.exports = User;
