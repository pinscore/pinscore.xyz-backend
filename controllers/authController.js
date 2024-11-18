const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const User = require("../models/userModel");

// Signup Controller
exports.signup = async (req, res) => {
  const { name, gmail, username, password, country } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ gmail }, { username }] });
    if (userExists)
      return res
        .status(400)
        .json({ message: "Gmail or Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = crypto.randomInt(100000, 999999);

    const newUser = new User({
      name,
      gmail,
      username,
      password: hashedPassword,
      country,
      otp,
      isVerified: false,
    });

    await newUser.save();

    // Send a welcome email with OTP
    const emailHtml = `
   <h1>Welcome to Pinscore, ${name}!</h1>
   <p>Thank you for signing up. Please use the following One-Time Password (OTP) to verify your account:</p>
   <h2>${otp}</h2>
   <p>This OTP will expire in 10 minutes.</p>
 `;

    await sendEmail(
      gmail,
      "Welcome to Pinscore - Verify Your Email",
      emailHtml
    );

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
  const { gmail, otp } = req.body;

  try {
    const user = await User.findOne({ gmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark user as verified and clear OTP
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
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ gmail: identifier }, { username: identifier }],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
