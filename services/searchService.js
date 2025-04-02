const Event = require('../models/Event');
const Category = require('../models/Category');
const { handleDatabaseError } = require('../utils/errorHandler');
const { isValidCoordinates } = require('../utils/geoUtils');
require('dotenv').config();

/**
 * Service for search-related operations
 */
class SearchService {
  /**
   * Search events by location
   * @param {object} searchParams - Search parameters
   * @param {object} user - User object (optional, for using user location)
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Search results and parameters
   */
  async searchByLocation(searchParams, user, req) {
    try {
      // Get query parameters with defaults
      let latitude = parseFloat(searchParams.latitude);
      let longitude = parseFloat(searchParams.longitude);
      const radius = parseFloat(searchParams.radius) || 
                    parseFloat(process.env.DEFAULT_SEARCH_RADIUS) || 10;
      
      const page = parseInt(searchParams.page) || 1;
      const limit = parseInt(searchParams.limit) || 10;
      
      let categoryIds = searchParams.categories 
        ? Array.isArray(searchParams.categories) 
          ? searchParams.categories.map(Number) 
          : [Number(searchParams.categories)]
        : [];
        
      const startDate = searchParams.startDate;
      const endDate = searchParams.endDate;

      // If no coordinates provided, use user's location or default
      if (!isValidCoordinates(latitude, longitude)) {
        if (user && user.location) {
          latitude = user.location.latitude;
          longitude = user.location.longitude;
        } else {
          latitude = parseFloat(process.env.DEFAULT_LATITUDE) || 37.7749;
          longitude = parseFloat(process.env.DEFAULT_LONGITUDE) || -122.4194;
        }
      }

      // Search events
      const { events, pagination } = await Event.searchByLocation({
        latitude,
        longitude,
        radius,
        categoryIds,
        startDate,
        endDate,
        page,
        limit
      });

      return {
        searchParameters: {
          latitude,
          longitude,
          radius,
          categoryIds,
          startDate,
          endDate
        },
        events,
        pagination
      };
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get all categories
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<Array>} List of categories
   */
  async getAllCategories(req) {
    try {
      const categories = await Category.getAll();
      return categories;
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Search events by text
   * @param {string} query - Search query
   * @param {object} filters - Additional filters
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<object>} Search results
   */
  async searchEventsByText(query, filters, req) {
    try {
      // This would require extending the Event model with a text search method
      // For now, we'll just return a placeholder
      
      // Example implementation:
      // const { events, pagination } = await Event.searchByText(query, filters);
      
      throw new Error('Text search not implemented yet');
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get trending events
   * @param {number} limit - Number of events to return
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<Array>} List of trending events
   */
  async getTrendingEvents(limit = 5, req) {
    try {
      // This would require extending the Event model with a method to get trending events
      // Trending could be determined by number of favorites, reviews, etc.
      
      // Example implementation:
      // const trendingEvents = await Event.getTrending(limit);
      
      throw new Error('Trending events not implemented yet');
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
  
  /**
   * Get nearby events
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radius - Search radius in km
   * @param {number} limit - Number of events to return
   * @param {object} req - Express request object (for i18n)
   * @returns {Promise<Array>} List of nearby events
   */
  async getNearbyEvents(latitude, longitude, radius = 10, limit = 5, req) {
    try {
      // This is a simplified version of searchByLocation
      if (!isValidCoordinates(latitude, longitude)) {
        latitude = parseFloat(process.env.DEFAULT_LATITUDE) || 37.7749;
        longitude = parseFloat(process.env.DEFAULT_LONGITUDE) || -122.4194;
      }
      
      const { events } = await Event.searchByLocation({
        latitude,
        longitude,
        radius,
        page: 1,
        limit
      });
      
      return events;
    } catch (error) {
      throw handleDatabaseError(req, error);
    }
  }
}

module.exports = new SearchService();