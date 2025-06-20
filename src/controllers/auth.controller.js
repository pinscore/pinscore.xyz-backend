const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail.utils");
const crypto = require("crypto");
const User = require("../schema/user.schema");
const fs = require("fs");
const path = require("path");

// Signup Controller
exports.signup = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (user && user.isVerified) {
      return res.status(200).json({
        message: "User already verified",
        isVerified: true,
        hasUsername: !!user.username,
        hasPassword: !!user.password,
      });
    }

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
      await new User({
        email,
        otp,
        otpExpiration,
        isVerified: false,
        isAdmin: false,
      }).save();
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
        hasPassword: false,
      });
    }

    const hasUnexpiredOtp = user.otp && user.otpExpiration && new Date() < user.otpExpiration;

    res.status(200).json({
      exists: true,
      isVerified: user.isVerified,
      hasUsername: !!user.username,
      hasUnexpiredOtp,
      hasPassword: !!user.password,
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

    if (!user.isVerified) {
      return res.status(403).json({ message: "Your account is not verified" });
    }

    if (!user.password) {
      return res.status(403).json({ message: "No password set for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Set Password Controller
exports.setPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    if (!user.username) {
      return res.status(400).json({ message: "Please set a username first" });
    }

    if (user.password) {
      return res.status(400).json({ message: "Password already set" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9!@#$%^&*])(?=.*[a-z]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number or special character"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password set successfully",
      userId: user._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};