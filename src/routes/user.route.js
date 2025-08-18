const express = require("express");
const userController = require("../controllers/user.controller");
const authenticateToken = require("../middleware/authToken.middleware");
const paginate = require("../middleware/pagination.middleware");
const upload = require("../middleware/upload.middleware");



const router = express.Router();

router.get("/profile", authenticateToken, userController.getProfile);
router.get("/all", authenticateToken, paginate, userController.getAllUsers);
router.put("/update-profile", authenticateToken, upload.single('profilePicture'), userController.updateProfile);

module.exports = router;
