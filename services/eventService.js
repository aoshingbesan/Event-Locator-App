const Event = require('../models/Event');
const Category = require('../models/Category');
const notificationService = require('./notificationService');
const { createError, handleDatabaseError } = require('../utils/errorHandler');

/**
 * Service for event-related operations
 */
class EventService {
  /**
   * Create a new event
   * @param {object} eventData - Event data
   * @param {number} userId - ID of the user creating the event
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Created event
   */
  async createEvent(eventData, userId, req) {
    try {
      // Validate categories
      if (eventData.categories && eventData.categories.length > 0) {
        for (const categoryId of eventData.categories) {
          const category = await Category.getById(categoryId);
          if (!category) {
            throw createError(req.t('categoryNotFound'), 400);
          }
        }
      }
      
      // Create event
      const event = await Event.create({
        ...eventData,
        creatorId: userId
      });
      
      // Send notification about new event
      try {
        await notificationService.sendNewEventNotification(event.id);
        
        // Schedule reminder for 24 hours before event
        const reminderTime = new Date(event.start_time);
        reminderTime.setHours(reminderTime.getHours() - 24);
        await notificationService.scheduleEventReminder(event.id, reminderTime);
      } catch (notificationError) {
        console.error('Error sending event notification:', notificationError);
        // Don't fail the request if notification fails
      }
      
      return event;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get event by ID
   * @param {number} id - Event ID
   * @param {number|null} userId - ID of the requesting user (for checking if favorited)
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Event with additional info
   */
  async getEventById(id, userId, req) {
    try {
      // Get event
      const event = await Event.getById(id);
      
      if (!event) {
        throw createError(req.t('notFound'), 404);
      }
      
      // Get average rating
      const ratingInfo = await Event.getAverageRating(id);
      
      // Check if user has favorited this event
      let isFavorited = false;
      if (userId) {
        isFavorited = await Event.isFavorited(userId, id);
      }
      
      return {
        event,
        rating: ratingInfo,
        isFavorited
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Update an event
   * @param {number} id - Event ID
   * @param {object} eventData - Updated event data
   * @param {number} userId - ID of the user updating the event
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Updated event
   */
  async updateEvent(id, eventData, userId, req) {
    try {
      // Check if event exists and user is the creator
      const existingEvent = await Event.getById(id);
      if (!existingEvent) {
        throw createError(req.t('notFound'), 404);
      }
      
      if (existingEvent.creator_id !== userId) {
        throw createError(req.t('unauthorized'), 403);
      }
      
      // Validate categories if provided
      if (eventData.categories && eventData.categories.length > 0) {
        for (const categoryId of eventData.categories) {
          const category = await Category.getById(categoryId);
          if (!category) {
            throw createError(req.t('categoryNotFound'), 400);
          }
        }
      }
      
      // Update event
      const event = await Event.update(id, eventData);
      
      return event;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Delete an event
   * @param {number} id - Event ID
   * @param {number} userId - ID of the user deleting the event
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteEvent(id, userId, req) {
    try {
      // Check if event exists and user is the creator
      const existingEvent = await Event.getById(id);
      if (!existingEvent) {
        throw createError(req.t('notFound'), 404);
      }
      
      if (existingEvent.creator_id !== userId) {
        throw createError(req.t('unauthorized'), 403);
      }
      
      // Delete event
      const success = await Event.delete(id);
      
      if (!success) {
        throw createError(req.t('serverError'), 500);
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
   * Get all events with filtering
   * @param {object} filters - Filter criteria
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Events and pagination info
   */
  async getAllEvents(filters, req) {
    try {
      const { events, pagination } = await Event.getAll(filters);
      return { events, pagination };
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Add a review to an event
   * @param {number} eventId - Event ID
   * @param {number} userId - User ID
   * @param {number} rating - Rating (1-5)
   * @param {string} review - Review text
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Review data
   */
  async addReview(eventId, userId, rating, review, req) {
    try {
      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        throw createError(req.t('notFound'), 404);
      }
      
      // Add review
      const reviewResult = await Event.addReview(eventId, userId, rating, review);
      
      return reviewResult;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get reviews for an event
   * @param {number} eventId - Event ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Reviews and pagination info
   */
  async getReviews(eventId, page, limit, req) {
    try {
      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        throw createError(req.t('notFound'), 404);
      }
      
      // Get reviews
      const { reviews, pagination } = await Event.getReviews(eventId, page, limit);
      
      return { reviews, pagination };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw handleDatabaseError(req, error);
    }
  }
}

module.exports = new EventService();