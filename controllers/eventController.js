const Event = require('../models/Event');
const notificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

// Create a new event
exports.createEvent = async (req, res) => {
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

    const { 
      title, 
      description, 
      latitude, 
      longitude, 
      address, 
      startTime, 
      endTime, 
      categories 
    } = req.body;

    // Create event
    const event = await Event.create({
      title,
      description,
      latitude,
      longitude,
      address,
      startTime,
      endTime,
      creatorId: req.user.id,
      categories
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

    res.status(201).json({
      success: true,
      message: req.t('eventCreated'),
      data: { event }
    });
  } catch (error) {
    console.error('Create event error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get event by ID
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Get event
    const event = await Event.getById(id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    // Get average rating
    const ratingInfo = await Event.getAverageRating(id);

    // Check if user has favorited this event
    let isFavorited = false;
    if (req.user) {
      isFavorited = await Event.isFavorited(req.user.id, id);
    }

    res.status(200).json({
      success: true,
      data: { 
        event,
        rating: ratingInfo,
        isFavorited
      }
    });
  } catch (error) {
    console.error('Get event error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
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

    const { id } = req.params;
    const { 
      title, 
      description, 
      latitude, 
      longitude, 
      address, 
      startTime, 
      endTime, 
      categories 
    } = req.body;

    // Check if event exists and user is the creator
    const existingEvent = await Event.getById(id);
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    if (existingEvent.creator_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: req.t('unauthorized') 
      });
    }

    // Update event
    const event = await Event.update(id, {
      title,
      description,
      latitude,
      longitude,
      address,
      startTime,
      endTime,
      categories
    });

    res.status(200).json({
      success: true,
      message: req.t('eventUpdated'),
      data: { event }
    });
  } catch (error) {
    console.error('Update event error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists and user is the creator
    const existingEvent = await Event.getById(id);
    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    if (existingEvent.creator_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: req.t('unauthorized') 
      });
    }

    // Delete event
    await Event.delete(id);

    res.status(200).json({
      success: true,
      message: req.t('eventDeleted')
    });
  } catch (error) {
    console.error('Delete event error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get all events with filtering and pagination
exports.getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let categoryIds = req.query.categories 
      ? Array.isArray(req.query.categories) 
        ? req.query.categories.map(Number) 
        : [Number(req.query.categories)]
      : [];
    const creatorId = req.query.creatorId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Get events
    const { events, pagination } = await Event.getAll({
      page,
      limit,
      categoryIds,
      creatorId,
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination
      }
    });
  } catch (error) {
    console.error('Get all events error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Add review to event
exports.addReview = async (req, res) => {
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

    const { id } = req.params;
    const { rating, review } = req.body;

    // Check if event exists
    const event = await Event.getById(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    // Add review
    const reviewResult = await Event.addReview(id, req.user.id, rating, review);

    res.status(200).json({
      success: true,
      message: req.t('reviewAdded'),
      data: { review: reviewResult }
    });
  } catch (error) {
    console.error('Add review error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get event reviews
exports.getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Check if event exists
    const event = await Event.getById(id);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: req.t('notFound') 
      });
    }

    // Get reviews
    const { reviews, pagination } = await Event.getReviews(id, page, limit);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination
      }
    });
  } catch (error) {
    console.error('Get reviews error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};