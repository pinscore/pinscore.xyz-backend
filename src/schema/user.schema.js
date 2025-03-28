// src/schema/user.schema.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  otp: { type: String },
  otpExpiration: { type: Date },
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  twitter: {
    id: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String }
  },
  instagram: {
    id: { type: String },
    accessToken: { type: String }
  }
});

module.exports = mongoose.model("User", userSchema);