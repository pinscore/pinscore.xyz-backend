const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");

// Signup Controller
exports.signup = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists && userExists.isVerified && userExists.username) {
      return res.status(400).json({ message: "Email already exists and is fully registered" });
    }

    let user = await User.findOne({ email });
    
    if (user && user.otp && user.otpExpiration && new Date() < user.otpExpiration) {
      return res.status(200).json({
        message: "Please use the existing OTP sent to your email.",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); 

    if (user) {
      user.otp = otp;
      user.otpExpiration = otpExpiration;
      await user.save();
    } else {
      user = new User({
        email,
        otp,
        otpExpiration,
        isVerified: false,
        isAdmin: false,
      });
      await user.save();
    }

    const templatePath = path.join(__dirname, "../templates/otpTemplate.html");
    let emailHtml = fs.readFileSync(templatePath, "utf-8");

    emailHtml = emailHtml
      .replace("{{otp}}", otp)
      .replace("{{year}}", new Date().getFullYear());

    await sendEmail(email, "Verify Your Email", emailHtml);

    res.status(201).json({
      message: "OTP sent successfully. Please check your email.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Validate OTP Controller
exports.validateOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || !user.otpExpiration || new Date() > user.otpExpiration) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    res.json({
      message: "Account verified successfully",
      needsUsername: !user.username,
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Set Username Controller
exports.setUsername = async (req, res) => {
  const { email, username } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    if (user.username) {
      return res.status(400).json({ message: "Username already set" });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    user.username = username;
    await user.save();

    res.json({ message: "Username set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Check Status Controller
exports.checkStatus = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        exists: false,
        isVerified: false,
        hasUsername: false,
        hasUnexpiredOtp: false,
      });
    }

    const hasUnexpiredOtp = user.otp && user.otpExpiration && new Date() < user.otpExpiration;

    res.status(200).json({
      exists: true,
      isVerified: user.isVerified,
      hasUsername: !!user.username,
      hasUnexpiredOtp,
    });
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
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

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
      .replace("{{name}}", user.name)
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
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiration = null;
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

