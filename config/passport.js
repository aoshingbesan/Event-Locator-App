const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
require('dotenv').config();

// Local strategy for username/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'usernameOrEmail',
    passwordField: 'password'
  },
  async (usernameOrEmail, password, done) => {
    try {
      // Find user by username or email
      const user = await User.findByUsernameOrEmail(usernameOrEmail);
      
      // If user not found
      if (!user) {
        return done(null, false, { message: 'Invalid username/email or password' });
      }
      
      // Check password
      const isMatch = await User.comparePassword(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Invalid username/email or password' });
      }
      
      // Remove password from user object
      delete user.password;
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// JWT strategy for token authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
  try {
    // Find user by ID from JWT payload
    const user = await User.findById(jwtPayload.id);
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

module.exports = passport;