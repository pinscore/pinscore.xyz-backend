const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary.config");

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "profile_pictures",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${req.user.userId}_${Date.now()}`,
      transformation: [{ width: 200, height: 200, crop: "fill" }], // ✅ 200x200 crop
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // ✅ 2MB max
});

module.exports = upload;
