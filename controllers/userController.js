const User = require('../models/User');
const Event = require('../models/Event');
const { validationResult } = require('express-validator');

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('validationError'), 
        errors: errors.array() 
      });
    }

    const { username, email, fullName, preferredLanguage, latitude, longitude } = req.body;

    // If username or email is changed, check if they already exist
    if (username && username !== req.user.username) {
      const existingUser = await User.findByUsernameOrEmail(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ 
          success: false, 
          message: req.t('auth:usernameExists') 
        });
      }
    }

    if (email && email !== req.user.email) {
      const existingUser = await User.findByUsernameOrEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ 
          success: false, 
          message: req.t('auth:emailExists') 
        });
      }
    }

    // Update user
    const updatedUser = await User.update(req.user.id, {
      username,
      email,
      fullName,
      preferredLanguage,
      latitude,
      longitude
    });

    res.status(200).json({
      success: true,
      message: req.t('profileUpdated'),
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.full_name,
          location: updatedUser.location,
          preferredLanguage: updatedUser.preferred_language,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Update preferred categories
exports.updateCategories = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('validationError'), 
        errors: errors.array() 
      });
    }

    const { categories } = req.body;

    // Update user's preferred categories
    const updatedCategories = await User.setPreferredCategories(req.user.id, categories);

    res.status(200).json({
      success: true,
      message: req.t('categoriesUpdated'),
      data: {
        categories: updatedCategories
      }
    });
  } catch (error) {
    console.error('Update categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get user's favorite events
exports.getFavorites = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Get user's favorite events
    const { events, pagination } = await Event.getUserFavorites(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Favorite an event
exports.favoriteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.getById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    // Add event to favorites
    await Event.favoriteEvent(req.user.id, eventId);

    res.status(200).json({
      success: true,
      message: req.t('eventFavorited')
    });
  } catch (error) {
    console.error('Favorite event error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Unfavorite an event
exports.unfavoriteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Remove event from favorites
    const result = await Event.unfavoriteEvent(req.user.id, eventId);

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    res.status(200).json({
      success: true,
      message: req.t('eventUnfavorited')
    });
  } catch (error) {
    console.error('Unfavorite event error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};