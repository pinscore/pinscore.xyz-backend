const express = require("express");
const userController = require("../controllers/user.controller");
const authenticateToken = require("../middleware/authToken.middleware");
const paginate = require("../middleware/pagination.middleware");

const router = express.Router();

router.get("/profile", authenticateToken, userController.getProfile);
router.get("/all", authenticateToken, paginate, userController.getAllUsers);
router.put("/update-profile", authenticateToken, userController.updateProfile);

module.exports = router;