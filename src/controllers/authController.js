const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");

// Signup Controller
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res
        .status(400)
        .json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = crypto.randomInt(100000, 999999);

    // Create a new user instance
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      isAdmin: false,
      isVerified: false,
    });

    await newUser.save();

    // Load the email template
    const templatePath = path.join(__dirname, "../templates/otpTemplate.html");
    let emailHtml = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders in the template
    emailHtml = emailHtml
      .replace("{{name}}", name)
      .replace("{{otp}}", otp)
      .replace("{{year}}", new Date().getFullYear());

    await sendEmail(email, "Verify Your Email", emailHtml);

    res.status(201).json({
      message:
        "User created successfully. Please check your email for the OTP.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//Validate otp Controller
exports.validateOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    await user.save();

    res.json({ message: "Account verified successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Login Controller
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Your account is not verified. Please complete verification.",
      });
    }

    // Generate a JWT token for successful login
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.sendForgotPasswordOtp = async (req, res) => {
  const { identifier } = req.body;

  try {
    // Find the user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const otp = crypto.randomInt(100000, 999999).toString();

    const otpExpiration = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    const templatePath = path.join(
      __dirname,
      "../templates/forgotPasswordTemplate.html"
    );
    let emailHtml = fs.readFileSync(templatePath, "utf-8");
    emailHtml = emailHtml
      .replace("{{username}}", user.username)
      .replace("{{otp}}", otp)
      .replace("{{year}}", new Date().getFullYear());

    await sendEmail(user.email, "Forgot Password OTP", emailHtml);

    res.status(201).json({
      message: "OTP sent successfully. Please check your email for the OTP.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Password Controller
exports.updatePassword = async (req, res) => {
  const { identifier, otp, newPassword } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the OTP is valid and not expired
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    user.password = hashedPassword;
    user.otp = null; // Clear the OTP
    user.otpExpiration = null; // Clear the OTP expiration
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

