const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/authToken.middleware");

const router = express.Router();

// Existing routes
router.post("/signup", authController.signup);
router.post("/validate-otp", authController.validateOtp);
router.post("/set-username", authController.setUsername);
router.post('/check-status', authController.checkStatus);
router.post('/set-password', authController.setPassword);
router.post("/login", authController.login);
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=authentication_failed`,
  }),
  authController.googleCallback
);

module.exports = router;