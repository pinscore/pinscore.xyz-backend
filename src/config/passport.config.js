const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../schema/user.schema');

module.exports = (passport) => {
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
            // Create new user without username (force step 3)
            user = new User({
              fullName: profile.displayName,
              email: profile.emails[0].value,
              isVerified: true, // Skip OTP
              isAdmin: false,
              // No username set here – user will add it
            });
            await user.save();
          } else {
            // Existing user: ensure verified, update fullName if needed
            user.isVerified = true;
            user.fullName = profile.displayName;
            // Still don't set username if missing – let flow handle
            await user.save();
          }
          return done(null, user);
        } catch (err) {
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