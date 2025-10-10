// Load environment variables FIRST before any other imports
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const passport = require("passport");
const configurePassport = require("./src/config/passport.config");
const connectDB = require("./src/config/db.config");
const authRoutes = require("./src/routes/auth.route");
const userRoutes = require("./src/routes/user.route");
const socialRoutes = require("./src/routes/social.route");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


configurePassport(passport);
// Initialize Passport
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/social", socialRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error occurred:", err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "File too large. Maximum size is 2MB." });
    }
    return res.status(400).json({ message: "File upload error: " + err.message });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: "Validation error: " + err.message });
  }
  
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();