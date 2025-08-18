const User = require("../schema/user.schema");
const cloudinary = require("../config/cloudinary.config");


// Get Profile Controller
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -otp -otpExpiration"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      message: "Profile retrieved successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture?.url || null,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get All Users (Admin) Controller
exports.getAllUsers = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!requestingUser.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied: Admin privileges required" });
    }

    const { skip, limit } = req.pagination;
    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .select("-password -otp -otpExpiration")
      .skip(skip)
      .limit(limit);

    res.json({
      message: "All users retrieved successfully",
      users: users.map((user) => ({
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture?.url || null,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      })),
      pagination: {
        currentPage: req.pagination.page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers,
        limit: limit,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Profile Controller
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, username, email } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle text fields
    if (fullName) user.fullName = fullName.trim();
    if (username) user.username = username.trim();
    if (email && email !== user.email) {
      user.email = email.trim();
      user.isVerified = false; // force re-verification if email changed
      // TODO: send verification email here
    }

    // Handle profile picture upload
    if (req.file) {
      // Delete old image if exists
      if (user.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(user.profilePicture.public_id);
      }

      user.profilePicture = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture?.url || null,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};