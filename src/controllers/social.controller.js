const User = require("../schema/user.schema");
const axios = require("axios");

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_CLIENT_ID = process.env.CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.CLIENT_SECRET;
const INSTAGRAM_API_URL = "https://graph.instagram.com";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

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
      "https://api.twitter.com/2/oauth2/token",
      {
        code,
        grant_type: "authorization_code",
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: process.env.TWITTER_REDIRECT_URI,
        code_verifier: "challenge",
      },
      {
        auth: {
          username: TWITTER_CLIENT_ID,
          password: TWITTER_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    user.twitter = {
      id: userResponse.data.data.id,
      accessToken: access_token,
      refreshToken: refresh_token,
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
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=
    ${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
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
      "https://api.instagram.com/oauth/access_token",
      {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, user_id } = tokenResponse.data;

    user.instagram = {
      id: user_id,
      accessToken: access_token,
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
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          "tweet.fields": "public_metrics",
          max_results: 10,
        },
      }
    );

    const tweets = response.data.data || [];
    let totalLikes = 0,
      totalComments = 0,
      totalShares = 0,
      totalImpressions = 0;

    tweets.forEach((tweet) => {
      totalLikes += tweet.public_metrics.like_count;
      totalComments += tweet.public_metrics.reply_count;
      totalShares += tweet.public_metrics.retweet_count;
      totalImpressions += tweet.public_metrics.impression_count || 0;
    });

    return {
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      impressions: totalImpressions,
    };
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
          limit: 10,
        },
      }
    );

    const media = mediaResponse.data.data || [];
    let totalLikes = 0,
      totalComments = 0,
      totalShares = 0,
      totalImpressions = 0;

    for (const item of media) {
      totalLikes += item.like_count || 0;
      totalComments += item.comments_count || 0;

      const insightsResponse = await axios.get(
        `${INSTAGRAM_API_URL}/${item.id}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: "impressions,shares",
            period: "lifetime",
          },
        }
      );

      const insights = insightsResponse.data.data || [];
      totalImpressions +=
        insights.find((i) => i.name === "impressions")?.values[0]?.value || 0;
      totalShares +=
        insights.find((i) => i.name === "shares")?.values[0]?.value || 0;
    }

    return {
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      impressions: totalImpressions,
    };
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
      const twitterData = await fetchTwitterAnalytics(
        user.twitter.id,
        user.twitter.accessToken
      );
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
      const instagramData = await fetchInstagramAnalytics(
        user.instagram.id,
        user.instagram.accessToken
      );
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
      data: analytics,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Search YouTube channel by Username
const searchYouTubeChannel = async (username) => {
  try {
    const response = await axios.get(`${YOUTUBE_API_URL}/search`, {
      params: {
        part: "snippet",
        q: username,
        type: "channel",
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      },
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].snippet.channelId;
    }
    return null;
  } catch (err) {
    console.error("YouTube search error:", err.response?.data || err.message);
    return null;
  }
};

// Get YouTube channel statistics
const fetchYouTubeAnalytics = async (channelId) => {
  try {
    // Get channel statistics
    const channelResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      params: {
        part: "statistics,snippet",
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (
      !channelResponse.data.items ||
      channelResponse.data.items.length === 0
    ) {
      return null;
    }

    const channel = channelResponse.data.items[0];
    const stats = channel.statistics;

    // Get recent videos for additional metrics
    const videosResponse = await axios.get(`${YOUTUBE_API_URL}/search`, {
      params: {
        part: "snippet",
        channelId: channelId,
        type: "video",
        order: "date",
        maxResults: 10,
        key: YOUTUBE_API_KEY,
      },
    });

    let totalVideoLikes = 0;
    let totalVideoViews = 0;

    // Get detailed stats for recent videos
    if (videosResponse.data.items && videosResponse.data.items.length > 0) {
      const videoIds = videosResponse.data.items
        .map((item) => item.id.videoId)
        .join(",");

      const videoStatsResponse = await axios.get(`${YOUTUBE_API_URL}/videos`, {
        params: {
          part: "statistics",
          id: videoIds,
          key: YOUTUBE_API_KEY,
        },
      });

      if (videoStatsResponse.data.items) {
        videoStatsResponse.data.items.forEach((video) => {
          totalVideoLikes += parseInt(video.statistics.likeCount || 0);
          totalVideoViews += parseInt(video.statistics.viewCount || 0);
        });
      }
    }

    return {
      channelName: channel.snippet.title,
      subscribers: parseInt(stats.subscriberCount || 0),
      totalViews: parseInt(stats.viewCount || 0),
      totalVideos: parseInt(stats.videoCount || 0),
      recentVideoLikes: totalVideoLikes,
      recentVideoViews: totalVideoViews,
      channelId: channelId,
    };
  } catch (err) {
    console.error(
      "YouTube analytics error:",
      err.response?.data || err.message
    );
    return null;
  }
};

// Get YouTube Analytics by Username Controller
exports.getYouTubeAnalyticsByUsername = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    // Search for channel by username
    const channelId = await searchYouTubeChannel(username);

    if (!channelId) {
      return res.status(404).json({
        message: "YouTube channel not found for the given username",
      });
    }

    // Get analytics for the found channel
    const analytics = await fetchYouTubeAnalytics(channelId);

    if (!analytics) {
      return res.status(404).json({
        message: "Unable to fetch YouTube analytics for this channel",
      });
    }

    res.json({
      message: "YouTube analytics retrieved successfully",
      data: {
        youtube: analytics,
      },
    });
  } catch (err) {
    console.error("YouTube analytics error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Enhanced getSocialAnalytics to include YouTube
exports.getSocialAnalytics = async (req, res) => {
  const { email, youtubeUsername } = req.body;

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
      const twitterData = await fetchTwitterAnalytics(
        user.twitter.id,
        user.twitter.accessToken
      );
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
      const instagramData = await fetchInstagramAnalytics(
        user.instagram.id,
        user.instagram.accessToken
      );
      if (instagramData) {
        analytics.instagram = instagramData;
      } else {
        analytics.instagram = { error: "Unable to fetch Instagram analytics" };
      }
    } else {
      analytics.instagram = { error: "Instagram account not linked" };
    }

    // Fetch YouTube analytics if username provided
    if (youtubeUsername) {
      const channelId = await searchYouTubeChannel(youtubeUsername);
      if (channelId) {
        const youtubeData = await fetchYouTubeAnalytics(channelId);
        if (youtubeData) {
          analytics.youtube = youtubeData;
        } else {
          analytics.youtube = { error: "Unable to fetch YouTube analytics" };
        }
      } else {
        analytics.youtube = { error: "YouTube channel not found" };
      }
    } else {
      analytics.youtube = { error: "YouTube username not provided" };
    }

    res.json({
      message: "Social analytics retrieved successfully",
      data: analytics,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get YouTube Channel Info by Username (separate endpoint)
exports.getYouTubeChannelInfo = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "Username parameter is required" });
  }

  try {
    const channelId = await searchYouTubeChannel(username);

    if (!channelId) {
      return res.status(404).json({
        message: "YouTube channel not found",
      });
    }

    const channelInfo = await fetchYouTubeAnalytics(channelId);

    if (!channelInfo) {
      return res.status(404).json({
        message: "Unable to fetch channel information",
      });
    }

    res.json({
      message: "Channel information retrieved successfully",
      data: channelInfo,
    });
  } catch (err) {
    console.error("YouTube channel info error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
