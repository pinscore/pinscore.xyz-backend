const express = require("express");
const socialController = require("../controllers/social.controller");
const authenticateToken = require("../middleware/authToken.middleware");

const router = express.Router();


module.exports = router;
