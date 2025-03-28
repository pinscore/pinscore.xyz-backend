const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/authToken.middleware");

const router = express.Router();

// routes
router.post("/signup", authController.signup);
router.post("/validate-otp", authController.validateOtp);
router.post("/set-username", authController.setUsername);
router.post('/check-status', authController.checkStatus);
router.post('/set-password', authController.setPassword);
router.post("/login", authController.login);
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

module.exports = router;
