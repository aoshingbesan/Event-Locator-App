const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const passport = require('passport');
const { check } = require('express-validator');

// Middleware for optional JWT authentication - will set req.user if token provided
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

/**
 * @route   GET /api/search/location
 * @desc    Search events by location
 * @access  Public (with optional authentication for user location)
 */
router.get('/location', optionalAuth, [
  check('latitude').optional().isFloat().withMessage('Latitude must be a number'),
  check('longitude').optional().isFloat().withMessage('Longitude must be a number'),
  check('radius').optional().isFloat({ min: 0.1 }).withMessage('Radius must be a positive number'),
  check('categories').optional().custom((value) => {
    // Allow both single values and arrays
    if (Array.isArray(value)) {
      return value.every(item => !isNaN(parseInt(item)));
    }
    return !isNaN(parseInt(value));
  }).withMessage('Categories must be valid integers'),
  check('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  check('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
], searchController.searchByLocation);

/**
 * @route   GET /api/search/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories', searchController.getCategories);

module.exports = router;