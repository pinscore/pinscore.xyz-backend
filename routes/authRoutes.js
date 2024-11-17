const express = require("express");
const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

// Define routes
router.post("/signup", authController.signup); // Signup route
router.post("/login", authController.login); // Login route
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

module.exports = router;
