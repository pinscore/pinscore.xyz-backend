const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db.config");
const authRoutes = require("./src/routes/auth.route");
const userRoutes = require("./src/routes/user.route");
const socialRoutes = require("./src/routes/social.route");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/social", socialRoutes);


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
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