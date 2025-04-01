const { check } = require('express-validator');
const { isValidCoordinates } = require('./geoUtils');

/**
 * Validation rules for user registration
 */
const userRegistrationValidation = [
  check('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers'),
  
  check('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  check('fullName')
    .optional()
    .isLength({ max: 100 }).withMessage('Full name must be less than 100 characters'),
  
  check('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  check('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  check('preferredLanguage')
    .optional()
    .isIn(['en', 'fr']).withMessage('Supported languages are: en, fr')
];

/**
 * Validation rules for user profile update
 */
const userProfileUpdateValidation = [
  check('username')
    .optional()
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers'),
  
  check('email')
    .optional()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  check('fullName')
    .optional()
    .isLength({ max: 100 }).withMessage('Full name must be less than 100 characters'),
  
  check('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  check('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  check('preferredLanguage')
    .optional()
    .isIn(['en', 'fr']).withMessage('Supported languages are: en, fr')
];

/**
 * Validation rules for user categories update
 */
const userCategoriesValidation = [
  check('categories')
    .isArray().withMessage('Categories must be an array')
    .custom(categories => {
      if (!categories.every(Number.isInteger)) {
        throw new Error('Category IDs must be integers');
      }
      return true;
    })
];

/**
 * Validation rules for password change
 */
const passwordChangeValidation = [
  check('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  check('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

/**
 * Validation rules for event creation
 */
const eventCreationValidation = [
  check('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title must be less than 100 characters'),
  
  check('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  
  check('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  check('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  check('address')
    .optional()
    .isLength({ max: 255 }).withMessage('Address must be less than 255 characters'),
  
  check('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be a valid date'),
  
  check('endTime')
    .optional()
    .isISO8601().withMessage('End time must be a valid date')
    .custom((endTime, { req }) => {
      if (endTime && new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  check('categories')
    .isArray().withMessage('Categories must be an array')
    .custom(categories => {
      if (!categories.every(Number.isInteger)) {
        throw new Error('Category IDs must be integers');
      }
      return true;
    })
];

/**
 * Validation rules for event update
 */
const eventUpdateValidation = [
  check('title')
    .optional()
    .isLength({ max: 100 }).withMessage('Title must be less than 100 characters'),
  
  check('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  
  check('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  check('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  check('address')
    .optional()
    .isLength({ max: 255 }).withMessage('Address must be less than 255 characters'),
  
  check('startTime')
    .optional()
    .isISO8601().withMessage('Start time must be a valid date'),
  
  check('endTime')
    .optional()
    .isISO8601().withMessage('End time must be a valid date')
    .custom((endTime, { req }) => {
      if (endTime && req.body.startTime && new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  check('categories')
    .optional()
    .isArray().withMessage('Categories must be an array')
    .custom(categories => {
      if (!categories.every(Number.isInteger)) {
        throw new Error('Category IDs must be integers');
      }
      return true;
    })
];

/**
 * Validation rules for review submission
 */
const reviewValidation = [
  check('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  check('review')
    .optional()
    .isLength({ max: 500 }).withMessage('Review must be less than 500 characters')
];

/**
 * Validation rules for location search
 */
const locationSearchValidation = [
  check('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  
  check('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  
  check('radius')
    .optional()
    .isFloat({ min: 0.1 }).withMessage('Radius must be a positive number'),
  
  check('categories')
    .optional()
    .custom(value => {
      // Allow both single values and arrays
      if (Array.isArray(value)) {
        return value.every(item => !isNaN(parseInt(item)));
      }
      return !isNaN(parseInt(value));
    }).withMessage('Categories must be valid integers'),
  
  check('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
  
  check('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (endDate && req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

module.exports = {
  userRegistrationValidation,
  userProfileUpdateValidation,
  userCategoriesValidation,
  passwordChangeValidation,
  eventCreationValidation,
  eventUpdateValidation,
  reviewValidation,
  locationSearchValidation
};