// src/routes/social.route.js (updated with FRONTEND_URL)
const express = require("express");
const passport = require("passport");
const authenticateToken = require("../middleware/authToken.middleware"); // Adjust path
const { getYoutubeAnalytics, disconnectYoutube } = require("../controllers/social.controller"); // Adjust path

const router = express.Router();

// YouTube OAuth routes
router.get(
  "/youtube/auth",
  passport.authenticate("youtube-oauth2", {
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "profile",
      "email",
    ],
  })
);

router.get(
  "/youtube/callback",
  passport.authenticate("youtube-oauth2", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/connected-accounts?success=youtube`);
  }
);

// Disconnect YouTube
router.put("/youtube/disconnect", authenticateToken, disconnectYoutube);

// Fetch YouTube analytics
router.get("/analytics/youtube", authenticateToken, getYoutubeAnalytics);

module.exports = router;