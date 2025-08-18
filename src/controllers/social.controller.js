const User = require("../schema/user.schema");
const axios = require("axios");

const INSTAGRAM_API_URL = "https://graph.instagram.com";
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com/v20.0";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

// Validate access token using APP_TOKEN
const validateToken = async (userToken, appToken) => {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API_URL}/debug_token?input_token=${userToken}&access_token=${appToken}`
    );
    return response.data.data.is_valid;
  } catch (err) {
    console.error("Token validation error:", err.response?.data || err.message);
    return false;
  }
};

// Instagram OAuth2 endpoints
exports.startInstagramAuth = async (req, res) => {
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${
    process.env.INSTAGRAM_CLIENT_ID
  }&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
  res.json({ authUrl });
};

exports.instagramCallback = async (req, res) => {
  const { code, email } = req.body;

  try {``
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
``
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

// Get Instagram User Information (Basic Display API)
exports.getInstagramUserInfo = async (req, res) => {
  const { email } = req.body;
  const USER_TOKEN = req.headers.authorization?.split(" ")[1] || req.body.userToken;

  if (!USER_TOKEN) {
    return res.status(400).json({ message: "User access token is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.userId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate token
    if (!(await validateToken(USER_TOKEN, process.env.APP_TOKEN))) {
      return res.status(401).json({ message: "Invalid user access token" });
    }

    // Fetch user profile
    const userResponse = await axios.get(`${INSTAGRAM_API_URL}/me`, {
      params: {
        fields: "id,username,account_type,media_count",
        access_token: USER_TOKEN,
      },
    });

    const userData = userResponse.data;

    res.json({
      message: "Instagram user information retrieved successfully",
      data: {
        instagram: {
          id: userData.id,
          username: userData.username,
          account_type: userData.account_type,
          media_count: userData.media_count,
        },
      },
    });
  } catch (err) {
    console.error("Instagram user info error:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching Instagram user information" });
  }
};

// Get Instagram User Information (Graph API for Business/Creator accounts)
exports.getInstagramUserInfoGraph = async (req, res) => {
  const { email } = req.body;
  const USER_TOKEN = req.headers.authorization?.split(" ")[1] || req.body.userToken;

  if (!USER_TOKEN) {
    return res.status(400).json({ message: "User access token is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.userId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate token
    if (!(await validateToken(USER_TOKEN, process.env.APP_TOKEN))) {
      return res.status(401).json({ message: "Invalid user access token" });
    }

    // Fetch Facebook Pages linked to the user
    const accountsResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_URL}/me/accounts`,
      {
        params: {
          access_token: USER_TOKEN,
        },
      }
    );

    if (!accountsResponse.data.data || accountsResponse.data.data.length === 0) {
      return res.status(404).json({ message: "No linked Facebook Pages found" });
    }

    // Assume the first Facebook Page is linked to the Instagram account
    const pageId = accountsResponse.data.data[0].id;

    // Fetch Instagram Business account
    const instagramResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_URL}/${pageId}?fields=instagram_business_account`,
      {
        params: {
          access_token: USER_TOKEN,
        },
      }
    );

    const instagramAccountId = instagramResponse.data.instagram_business_account?.id;
    if (!instagramAccountId) {
      return res.status(404).json({ message: "No Instagram Business account linked" });
    }

    // Fetch Instagram user details
    const userResponse = await axios.get(
      `${FACEBOOK_GRAPH_API_URL}/${instagramAccountId}`,
      {
        params: {
          fields: "username,followers_count,media_count,profile_picture_url",
          access_token: USER_TOKEN,
        },
      }
    );

    const userData = userResponse.data;

    res.json({
      message: "Instagram user information retrieved successfully",
      data: {
        instagram: {
          id: instagramAccountId,
          username: userData.username,
          followers_count: userData.followers_count,
          media_count: userData.media_count,
          profile_picture_url: userData.profile_picture_url,
        },
      },
    });
  } catch (err) {
    console.error("Instagram Graph API error:", err.response?.data || err.message);
    res.status(500).json({ message: "Error fetching Instagram user information" });
  }
};

// Fetch Instagram Analytics
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

// Get Social Analytics Controller
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

// Get YouTube Analytics by Username Controller
exports.getYouTubeAnalyticsByUsername = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const channelId = await searchYouTubeChannel(username);

    if (!channelId) {
      return res.status(404).json({
        message: "YouTube channel not found for the given username",
      });
    }

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

// Get YouTube Channel Info by Username
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