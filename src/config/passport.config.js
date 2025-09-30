const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../schema/user.schema");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // User exists, update if needed
          if (!user.fullName && profile.displayName) {
            user.fullName = profile.displayName;
          }
          if (!user.profilePicture.url && profile.photos[0]) {
            user.profilePicture.url = profile.photos[0].value;
          }
          // Mark as verified if signing in with Google
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          email: profile.emails[0].value,
          fullName: profile.displayName,
          profilePicture: {
            url: profile.photos[0]?.value || null,
          },
          isVerified: true,
          isAdmin: false,
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;