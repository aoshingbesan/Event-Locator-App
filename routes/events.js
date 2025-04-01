const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const passport = require('passport');
const { check } = require('express-validator');

// Middleware for JWT authentication
const authenticate = passport.authenticate('jwt', { session: false });

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private
 */
router.post('/', authenticate, [
  check('title').notEmpty().withMessage('Title is required'),
  check('latitude').isFloat().withMessage('Latitude must be a number'),
  check('longitude').isFloat().withMessage('Longitude must be a number'),
  check('startTime').isISO8601().withMessage('Start time must be a valid date'),
  check('categories').isArray().withMessage('Categories must be an array'),
  check('categories.*').isInt().withMessage('Category IDs must be integers'),
], eventController.createEvent);

/**
 * @route   GET /api/events
 * @desc    Get all events with filtering
 * @access  Public
 */
router.get('/', eventController.getAllEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public (with private enhancements if authenticated)
 */
router.get('/:id', (req, res, next) => {
  // Optional authentication - will set req.user if token provided
  passport.authenticate('jwt', { session: false, optional: true })(req, res, next);
}, eventController.getEvent);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (creator only)
 */
router.put('/:id', authenticate, [
  check('title').optional().notEmpty().withMessage('Title cannot be empty'),
  check('latitude').optional().isFloat().withMessage('Latitude must be a number'),
  check('longitude').optional().isFloat().withMessage('Longitude must be a number'),
  check('startTime').optional().isISO8601().withMessage('Start time must be a valid date'),
  check('categories').optional().isArray().withMessage('Categories must be an array'),
  check('categories.*').optional().isInt().withMessage('Category IDs must be integers'),
], eventController.updateEvent);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private (creator only)
 */
router.delete('/:id', authenticate, eventController.deleteEvent);

/**
 * @route   POST /api/events/:id/reviews
 * @desc    Add review to event
 * @access  Private
 */
router.post('/:id/reviews', authenticate, [
  check('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  check('review').optional().isString().withMessage('Review must be a string'),
], eventController.addReview);

/**
 * @route   GET /api/events/:id/reviews
 * @desc    Get event reviews
 * @access  Public
 */
router.get('/:id/reviews', eventController.getReviews);

module.exports = router;