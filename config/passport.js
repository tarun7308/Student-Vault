const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    callbackURL: "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }

        // Check if a user with the same email exists but signed up via email
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            user.googleId = profile.id;
            // Optionally update profile picture if not set
            if (!user.profilePic && profile.photos && profile.photos.length > 0) {
                user.profilePic = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
        }

        // If not, create a new user
        user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            profilePic: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
            role: 'student' // Default role
        });

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
  }
));

// We are not using session-based auth ultimately (using JWT), 
// but passport requires serialization if using its session middleware.
// For JWT approach with Google OAuth, we'll generate the token in the callback route.
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
