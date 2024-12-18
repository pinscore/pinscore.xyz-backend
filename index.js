const express = require("express");
const connectDB = require('./config/database');
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(express.json());
app.use(cors());

connectDB();  

// Use auth routes
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
