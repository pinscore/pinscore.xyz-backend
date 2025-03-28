const express = require("express");
const socialController = require("../controllers/social.controller");
const authenticateToken = require("../middleware/authToken.middleware");

const router = express.Router();

router.post("/analytics", authenticateToken, socialController.getSocialAnalytics);
router.get('/twitter/auth', socialController.startTwitterAuth);
router.post('/twitter/callback', socialController.twitterCallback);
router.get('/instagram/auth', socialController.startInstagramAuth);
router.post('/instagram/callback', socialController.instagramCallback);

module.exports = router;