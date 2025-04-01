/**
 * Centralized error handling utility
 */

/**
 * Create an error object with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Error object with status code
 */
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  };
  
  /**
   * Handle validation errors from express-validator
   * @param {object} req - Express request object
   * @param {Array} errors - Validation errors from express-validator
   * @returns {Error} Error object with validation errors
   */
  const handleValidationErrors = (req, errors) => {
    const error = createError(req.t('validationError'), 400);
    error.errors = errors.array();
    return error;
  };
  
  /**
   * Handle database errors
   * @param {object} req - Express request object
   * @param {Error} err - Database error
   * @returns {Error} Error object with appropriate message
   */
  const handleDatabaseError = (req, err) => {
    console.error('Database error:', err);
    
    // Handle common database errors
    if (err.code === '23505') {
      // Unique violation
      return createError(req.t('alreadyExists'), 400);
    } else if (err.code === '23503') {
      // Foreign key violation
      return createError(req.t('referenceError'), 400);
    } else if (err.code === '42P01') {
      // Undefined table
      return createError(req.t('serverError'), 500);
    }
    
    // Default database error
    return createError(req.t('serverError'), 500);
  };
  
  /**
   * Async handler to catch errors in async route handlers
   * @param {Function} fn - Async route handler
   * @returns {Function} Express middleware function
   */
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  module.exports = {
    createError,
    handleValidationErrors,
    handleDatabaseError,
    asyncHandler
  };