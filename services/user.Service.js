const User = require('../models/User');
const Event = require('../models/Event');
const Category = require('../models/Category');
const { createError, handleDatabaseError } = require('../utils/errorHandler');

/**
 * Service for user-related operations
 */
class UserService {
  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {object} userData - Updated user data
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Updated user
   */
  async updateProfile(userId, userData, req) {
    try {
      const { username, email, fullName, preferredLanguage, latitude, longitude } = userData;
      
      // If username or email is changing, check if they already exist
      if (username) {
        const user = await User.findById(userId);
        if (username !== user.username) {
          const existingUser = await User.findByUsernameOrEmail(username);
          if (existingUser && existingUser.id !== userId) {
            throw createError(req.t('auth:usernameExists'), 400);
          }
        }
      }
      
      if (email) {
        const user = await User.findById(userId);
        if (email !== user.email) {
          const existingUser = await User.findByUsernameOrEmail(email);
          if (existingUser && existingUser.id !== userId) {
            throw createError(req.t('auth:emailExists'), 400);
          }
        }
      }
      
      // Update user
      const updatedUser = await User.update(userId, {
        username,
        email,
        fullName,
        preferredLanguage,
        latitude,
        longitude
      });
      
      if (!updatedUser) {
        throw createError(req.t('serverError'), 500);
      }
      
      return updatedUser;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Update user preferred categories
   * @param {number} userId - User ID
   * @param {Array<number>} categoryIds - Category IDs
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<Array>} Updated categories
   */
  async updatePreferredCategories(userId, categoryIds, req) {
    try {
      // Validate categories
      if (categoryIds && categoryIds.length > 0) {
        for (const categoryId of categoryIds) {
          const category = await Category.getById(categoryId);
          if (!category) {
            throw createError(req.t('categoryNotFound'), 400);
          }
        }
      }
      
      // Update categories
      const updatedCategories = await User.setPreferredCategories(userId, categoryIds);
      
      return updatedCategories;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get user's favorite events
   * @param {number} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Favorite events and pagination
   */
  async getFavoriteEvents(userId, page, limit, req) {
    try {
      const { events, pagination } = await Event.getUserFavorites(userId, page, limit);
      return { events, pagination };
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Add an event to user's favorites
   * @param {number} userId - User ID
   * @param {number} eventId - Event ID
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Result
   */
  async favoriteEvent(userId, eventId, req) {
    try {
      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        throw createError(req.t('notFound'), 404);
      }
      
      // Add to favorites
      const result = await Event.favoriteEvent(userId, eventId);
      
      return result;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Remove an event from user's favorites
   * @param {number} userId - User ID
   * @param {number} eventId - Event ID
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<boolean>} Success indicator
   */
  async unfavoriteEvent(userId, eventId, req) {
    try {
      const result = await Event.unfavoriteEvent(userId, eventId);
      
      if (!result) {
        throw createError(req.t('notFound'), 404);
      }
      
      return true;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} username - Username
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<boolean>} Success indicator
   */
  async changePassword(userId, username, currentPassword, newPassword, req) {
    try {
      // Get user with password
      const user = await User.findByUsernameOrEmail(username);
      
      // Check current password
      const isMatch = await User.comparePassword(currentPassword, user.password);
      if (!isMatch) {
        throw createError(req.t('auth:incorrectPassword'), 400);
      }
      
      // Update password
      await User.updatePassword(userId, newPassword);
      
      return true;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get user profile with all data
   * @param {number} userId - User ID
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} User profile
   */
  async getFullProfile(userId, req) {
    try {
      // Get user with preferred categories
      const user = await User.findById(userId);
      if (!user) {
        throw createError(req.t('notFound'), 404);
      }
      
      const preferredCategories = await User.getPreferredCategories(userId);
      
      // Get stats
      const createdEvents = await this.getUserEventCount(userId);
      const favoriteCount = await this.getFavoriteCount(userId);
      const reviewCount = await this.getUserReviewCount(userId);
      
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          location: user.location,
          preferredLanguage: user.preferred_language,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          preferredCategories,
          stats: {
            createdEvents,
            favoriteCount,
            reviewCount
          }
        }
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get count of events created by user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Event count
   */
  async getUserEventCount(userId) {
    try {
      // This would require a new method in the Event model
      // For now, we'll return a placeholder
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get count of user's favorite events
   * @param {number} userId - User ID
   * @returns {Promise<number>} Favorite count
   */
  async getFavoriteCount(userId) {
    try {
      // This would require a new method in the Event model
      // For now, we'll return a placeholder
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get count of reviews by user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Review count
   */
  async getUserReviewCount(userId) {
    try {
      // This would require a new method in the Event model
      // For now, we'll return a placeholder
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new UserService();