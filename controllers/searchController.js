const Event = require('../models/Event');
const Category = require('../models/Category');
const { validationResult } = require('express-validator');
require('dotenv').config();

// Search events by location
exports.searchByLocation = async (req, res) => {
  try {
    console.log('Search request received:', req.query);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('validationError'), 
        errors: errors.array() 
      });
    }

    // Get query parameters with defaults
    let latitude = parseFloat(req.query.latitude);
    let longitude = parseFloat(req.query.longitude);
    const radius = parseFloat(req.query.radius) || 
                  parseFloat(process.env.DEFAULT_SEARCH_RADIUS) || 10;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    let categoryIds = req.query.categories 
      ? Array.isArray(req.query.categories) 
        ? req.query.categories.map(Number) 
        : [Number(req.query.categories)]
      : [];
      
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // If no coordinates provided, use user's location or default
    if (isNaN(latitude) || isNaN(longitude)) {
      if (req.user && req.user.location) {
        latitude = req.user.location.latitude;
        longitude = req.user.location.longitude;
      } else {
        latitude = parseFloat(process.env.DEFAULT_LATITUDE) || 37.7749;
        longitude = parseFloat(process.env.DEFAULT_LONGITUDE) || -122.4194;
      }
    }

    console.log('Searching with coordinates:', { latitude, longitude, radius });

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

    console.log(`Found ${events.length} events`);

    res.status(200).json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('Search by location error details:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();

    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};