const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../schema/user.schema');

const axios = require('axios');

module.exports = (passport) => {
  // Existing Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = new User({
              fullName: profile.displayName,
              email: profile.emails[0].value,
              isVerified: true,
              isAdmin: false,
            });
            await user.save();
          } else {
            user.isVerified = true;
            user.fullName = profile.displayName;
            await user.save();
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // New YouTube Strategy (using Google OAuth with YouTube scopes)
  passport.use(
    'youtube-oauth2',
    new GoogleStrategy(
      {
        clientID: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        callbackURL: process.env.YOUTUBE_REDIRECT_URI,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Fetch user's YouTube channel
          const channelResponse = await axios.get(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&access_token=${accessToken}`
          );

          if (channelResponse.data.items.length === 0) {
            return done(new Error('No YouTube channel associated with this account'), null);
          }

          const channel = channelResponse.data.items[0];

          let user = await User.findOne({ email: profile.emails[0].value });
          if (!user) {
            user = new User({
              fullName: profile.displayName,
              email: profile.emails[0].value,
              isVerified: true,
              isAdmin: false,
            });
            await user.save();
          }

          user.youtube = {
            channelId: channel.id,
            channelName: channel.snippet.title,
            username: channel.snippet.customUrl || channel.snippet.title,
            accessToken,
            refreshToken,
          };

          await user.save();
          return done(null, user);
        } catch (err) {
          console.error('YouTube OAuth error:', err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};