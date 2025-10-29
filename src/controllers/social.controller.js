// src/controllers/social.controller.js (updated)
const User = require("../schema/user.schema");
const axios = require("axios");

exports.getYoutubeAnalytics = async (req, res) => {
    try {
        // Fetch full user from DB (token has only basic info)
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!user.youtube || !user.youtube.accessToken) {
            return res.status(400).json({ message: "YouTube not connected" });
        }

        let accessToken = user.youtube.accessToken;
        let stats;

        try {
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${accessToken}`
            );
            stats = response.data.items[0].statistics;
        } catch (error) {
            if (error.response?.status === 401 && user.youtube.refreshToken) {
                // Refresh access token
                const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
                    client_id: process.env.YOUTUBE_CLIENT_ID,
                    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
                    refresh_token: user.youtube.refreshToken,
                    grant_type: "refresh_token",
                });

                accessToken = tokenResponse.data.access_token;
                user.youtube.accessToken = accessToken;
                await user.save();  // Save refreshed token to DB

                // Retry fetch
                const retryResponse = await axios.get(
                    `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${accessToken}`
                );
                stats = retryResponse.data.items[0].statistics;
            } else {
                throw error;
            }
        }

        const formatNumber = (num) => {
            const number = parseInt(num) || 0;  // Fallback to 0
            if (number >= 1000) {
                return (number / 1000).toFixed(1) + "K";
            }
            return number.toString();
        };

        const metrics = {
            Impressions: formatNumber(stats.viewCount),
            Likes: "N/A",
            Comments: formatNumber(stats.commentCount),
            NewFollowers: formatNumber(stats.subscriberCount),
            Shares: "N/A",
            Saves: formatNumber(stats.videoCount),
        };

        const metricsRaw = {
            Impressions: parseInt(stats.viewCount) || 0,
            Likes: 0,  // Hardcoded, but fallback explicit
            Comments: parseInt(stats.commentCount) || 0,  // Key fix: || 0 handles null/undefined
            NewFollowers: parseInt(stats.subscriberCount) || 0,
            Shares: 0,  // Hardcoded
            Saves: parseInt(stats.videoCount) || 0,
        };

        const audience = [
            { id: 0, value: 45, label: "Male" },
            { id: 1, value: 35, label: "Female" },
            { id: 2, value: 20, label: "Other" },
        ];

        res.json({ metrics, metricsRaw, audience });
    } catch (error) {
        console.error("Error fetching YouTube analytics:", error);
        res.status(500).json({ message: "Failed to fetch YouTube analytics" });
    }
};

exports.disconnectYoutube = async (req, res) => {
    try {
        // Fetch full user from DB
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.youtube = null;
        await user.save();
        res.json({ message: "YouTube disconnected successfully" });
    } catch (error) {
        console.error("Error disconnecting YouTube:", error);
        res.status(500).json({ message: "Failed to disconnect YouTube" });
    }
};