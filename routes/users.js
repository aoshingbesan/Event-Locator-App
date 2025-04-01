const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const passport = require('passport');
const { check } = require('express-validator');

// Middleware for JWT authentication
const authenticate = passport.authenticate('jwt', { session: false });

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, [
  check('email').optional().isEmail().withMessage('Valid email is required'),
  check('preferredLanguage').optional().isIn(['en', 'fr']).withMessage('Supported languages are en and fr'),
  check('latitude').optional().isFloat().withMessage('Latitude must be a number'),
  check('longitude').optional().isFloat().withMessage('Longitude must be a number'),
], userController.updateProfile);

/**
 * @route   PUT /api/users/categories
 * @desc    Update user preferred categories
 * @access  Private
 */
router.put('/categories', authenticate, [
  check('categories').isArray().withMessage('Categories must be an array'),
  check('categories.*').isInt().withMessage('Category IDs must be integers'),
], userController.updateCategories);

/**
 * @route   GET /api/users/favorites
 * @desc    Get user's favorite events
 * @access  Private
 */
router.get('/favorites', authenticate, userController.getFavorites);

/**
 * @route   POST /api/users/favorites/:eventId
 * @desc    Add event to favorites
 * @access  Private
 */
router.post('/favorites/:eventId', authenticate, userController.favoriteEvent);

/**
 * @route   DELETE /api/users/favorites/:eventId
 * @desc    Remove event from favorites
 * @access  Private
 */
router.delete('/favorites/:eventId', authenticate, userController.unfavoriteEvent);

module.exports = router;