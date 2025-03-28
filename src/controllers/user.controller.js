const User = require("../schema/user.schema");
const bcrypt = require("bcryptjs");

// Get Profule Controller
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp -otpExpiration');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      message: "Profile retrieved successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Profule(Admin) Controller
exports.getAllUsers = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!requestingUser.isAdmin) {
      return res.status(403).json({ message: "Access denied: Admin privileges required" });
    }

    const { skip, limit } = req.pagination;
    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .select('-password -otp -otpExpiration')
      .skip(skip)
      .limit(limit);

    res.json({
      message: "All users retrieved successfully",
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      })),
      pagination: {
        currentPage: req.pagination.page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers,
        limit: limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Profule Controller
exports.updateProfile = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: user._id }
      });
      if (usernameExists) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: user._id }
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
      user.isVerified = false;
    }

    if (password) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9!@#$%^&*])(?=.*[a-z]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number or special character"
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      needsVerification: email && email !== user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};