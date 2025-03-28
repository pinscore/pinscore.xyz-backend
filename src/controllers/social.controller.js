const User = require("../schema/user.schema");
const axios = require("axios");

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_CLIENT_ID = process.env.CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.CLIENT_SECRET;
const INSTAGRAM_API_URL = "https://graph.instagram.com";






// Twitter OAuth2 endpoints
exports.startTwitterAuth = async (req, res) => {
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${process.env.TWITTER_REDIRECT_URI}&scope=users.read%20tweet.read%20offline.access&state=twitter&code_challenge=challenge&code_challenge_method=plain`;
    res.json({ authUrl });
};

exports.twitterCallback = async (req, res) => {
    const { code, email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.userId !== user._id.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Exchange code for tokens
        const tokenResponse = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            {
                code,
                grant_type: 'authorization_code',
                client_id: TWITTER_CLIENT_ID,
                redirect_uri: process.env.TWITTER_REDIRECT_URI,
                code_verifier: 'challenge'
            },
            {
                auth: {
                    username: TWITTER_CLIENT_ID,
                    password: TWITTER_CLIENT_SECRET
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token } = tokenResponse.data;

        // Get user info
        const userResponse = await axios.get(
            'https://api.twitter.com/2/users/me',
            {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        );

        user.twitter = {
            id: userResponse.data.data.id,
            accessToken: access_token,
            refreshToken: refresh_token
        };

        await user.save();
        res.json({ message: "Twitter account linked successfully" });
    } catch (err) {
        console.error("Twitter OAuth error:", err.response?.data || err.message);
        res.status(500).json({ message: "Error linking Twitter account" });
    }
};

// Instagram OAuth2 endpoints
exports.startInstagramAuth = async (req, res) => {
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
    res.json({ authUrl });
};

exports.instagramCallback = async (req, res) => {
    const { code, email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.userId !== user._id.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://api.instagram.com/oauth/access_token',
            {
                client_id: process.env.INSTAGRAM_CLIENT_ID,
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
                code
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, user_id } = tokenResponse.data;

        user.instagram = {
            id: user_id,
            accessToken: access_token
        };

        await user.save();
        res.json({ message: "Instagram account linked successfully" });
    } catch (err) {
        console.error("Instagram OAuth error:", err.response?.data || err.message);
        res.status(500).json({ message: "Error linking Instagram account" });
    }
};


// Get Twitter Analytics Controller
const fetchTwitterAnalytics = async (twitterId, accessToken) => {
    try {
        const response = await axios.get(
            `https://api.twitter.com/2/users/${twitterId}/tweets`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    "tweet.fields": "public_metrics",
                    max_results: 10
                }
            }
        );

        const tweets = response.data.data || [];
        let totalLikes = 0, totalComments = 0, totalShares = 0, totalImpressions = 0;

        tweets.forEach(tweet => {
            totalLikes += tweet.public_metrics.like_count;
            totalComments += tweet.public_metrics.reply_count;
            totalShares += tweet.public_metrics.retweet_count;
            totalImpressions += tweet.public_metrics.impression_count || 0;
        });

        return { likes: totalLikes, comments: totalComments, shares: totalShares, impressions: totalImpressions };
    } catch (err) {
        console.error("Twitter API error:", err.response?.data || err.message);
        return null;
    }
};


// Get Instagram Analytics Controller
const fetchInstagramAnalytics = async (instagramId, accessToken) => {
    try {
        const mediaResponse = await axios.get(
            `${INSTAGRAM_API_URL}/${instagramId}/media`,
            {
                params: {
                    access_token: accessToken,
                    fields: "id,like_count,comments_count,media_type",
                    limit: 10
                }
            }
        );

        const media = mediaResponse.data.data || [];
        let totalLikes = 0, totalComments = 0, totalShares = 0, totalImpressions = 0;

        for (const item of media) {
            totalLikes += item.like_count || 0;
            totalComments += item.comments_count || 0;

            const insightsResponse = await axios.get(
                `${INSTAGRAM_API_URL}/${item.id}/insights`,
                {
                    params: {
                        access_token: accessToken,
                        metric: "impressions,shares",
                        period: "lifetime"
                    }
                }
            );

            const insights = insightsResponse.data.data || [];
            totalImpressions += insights.find(i => i.name === "impressions")?.values[0]?.value || 0;
            totalShares += insights.find(i => i.name === "shares")?.values[0]?.value || 0;
        }

        return { likes: totalLikes, comments: totalComments, shares: totalShares, impressions: totalImpressions };
    } catch (err) {
        console.error("Instagram API error:", err.response?.data || err.message);
        return null;
    }
};


// Get Socials Analytics Controller
exports.getSocialAnalytics = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (req.user.userId !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        const analytics = {};

        // Fetch Twitter analytics
        if (user.twitter?.id && user.twitter?.accessToken) {
            const twitterData = await fetchTwitterAnalytics(user.twitter.id, user.twitter.accessToken);
            if (twitterData) {
                analytics.twitter = twitterData;
            } else {
                analytics.twitter = { error: "Unable to fetch Twitter analytics" };
            }
        } else {
            analytics.twitter = { error: "Twitter account not linked" };
        }

        // Fetch Instagram analytics
        if (user.instagram?.id && user.instagram?.accessToken) {
            const instagramData = await fetchInstagramAnalytics(user.instagram.id, user.instagram.accessToken);
            if (instagramData) {
                analytics.instagram = instagramData;
            } else {
                analytics.instagram = { error: "Unable to fetch Instagram analytics" };
            }
        } else {
            analytics.instagram = { error: "Instagram account not linked" };
        }

        res.json({
            message: "Social analytics retrieved successfully",
            data: analytics
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

