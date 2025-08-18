const express = require("express");
const socialController = require("../controllers/social.controller");
const authenticateToken = require("../middleware/authToken.middleware");

const router = express.Router();

router.post("/analytics", authenticateToken, socialController.getSocialAnalytics);
router.get("/instagram/auth", socialController.startInstagramAuth);
router.post("/instagram/callback", socialController.instagramCallback);
router.post("/youtube/analytics", authenticateToken, socialController.getYouTubeAnalyticsByUsername);
router.get("/youtube/channel", authenticateToken, socialController.getYouTubeChannelInfo);

module.exports = router;
