// index.js (Full + Corrected Version)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const passport = require("passport");

// Local modules
const configurePassport = require("./src/config/passport.config");
const connectDB = require("./src/config/db.config");
const authRoutes = require("./src/routes/auth.route");
const userRoutes = require("./src/routes/user.route");
const socialRoutes = require("./src/routes/social.route");

const app = express();


// CORS CONFIG (LOCAL + PRODUCTION)
app.use(cors({
  origin: [
    "http://localhost:3000",     // Local React dev
    "http://127.0.0.1:3000",
    "https://www.pinscore.xyz"  // Production frontend
  ],
  credentials: true
}));

// Body Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true when behind HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Passport Authentication
configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// HEALTH & ROOT ROUTES
app.get("/", (req, res) => {
  res.json({
    message: "Pinscore backend running successfully",
    timestamp: new Date()
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "OK",
    server: "Pinscore Backend API",
    timestamp: new Date()
  });
});

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/social", socialRoutes);

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("Error occurred:", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Max size 2MB." });
    }
    return res.status(400).json({ message: "Multer upload error: " + err.message });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation error: " + err.message });
  }

  res.status(500).json({ message: "Server error occurred", error: err.message });
});

// START SERVER
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
