const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
require('dotenv').config();

// Register new user
exports.register = async (req, res) => {
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

    const { username, email, password, fullName, latitude, longitude, preferredLanguage } = req.body;

    // Check if user already exists
    const existingUser = await User.findByUsernameOrEmail(username) || 
                         await User.findByUsernameOrEmail(email);
                         
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('auth:userExists')
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      latitude,
      longitude,
      preferredLanguage
    });

    // Set preferred categories if provided
    if (req.body.categories && Array.isArray(req.body.categories)) {
      await User.setPreferredCategories(user.id, req.body.categories);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data and token
    res.status(201).json({
      success: true,
      message: req.t('userRegistered'),
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          location: user.location,
          preferredLanguage: user.preferred_language
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error details:', error);  // Added detailed logging
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Passport local authentication is handled by middleware
    // If we reach here, authentication was successful

    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data and token
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          fullName: req.user.full_name,
          location: req.user.location,
          preferredLanguage: req.user.preferred_language
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    // Get user with preferred categories
    const user = await User.findById(req.user.id);
    const preferredCategories = await User.getPreferredCategories(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          location: user.location,
          preferredLanguage: user.preferred_language,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          preferredCategories
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByUsernameOrEmail(req.user.username);

    // Check current password
    const isMatch = await User.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: req.t('auth:incorrectPassword') 
      });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.status(200).json({
      success: true,
      message: req.t('passwordChanged')
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: req.t('serverError') 
    });
  }
};