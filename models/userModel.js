const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gmail: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  country: { type: String, required: true },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
