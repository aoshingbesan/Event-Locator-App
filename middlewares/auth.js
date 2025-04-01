const passport = require('passport');
const { createError } = require('../utils/errorHandler');

/**
 * Middleware to authenticate user with JWT
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return next(createError(req.t('unauthorized'), 401));
    }
    
    // Set user in request object
    req.user = user;
    return next();
  })(req, res, next);
};

/**
 * Middleware to authenticate user with JWT (optional)
 * Will set req.user if token is valid, but will not return error if not
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const optionalAuthenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    return next();
  })(req, res, next);
};

module.exports = {
  authenticate,
  optionalAuthenticate
};