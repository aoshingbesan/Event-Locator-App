const authController = require('../../controllers/authController');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('jsonwebtoken');
jest.mock('express-validator');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      body: {},
      t: jest.fn().mockImplementation(key => key) // Mock i18n translation function
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('register', () => {
    test('should register a new user and return token', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true)
      });

      // Mock request body
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        latitude: 37.7749,
        longitude: -122.4194
      };

      // Mock User.findByUsernameOrEmail to return null (user not found)
      User.findByUsernameOrEmail.mockResolvedValue(null);

      // Mock User.create
      User.create.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        preferred_language: 'en'
      });

      // Mock User.setPreferredCategories if needed
      User.setPreferredCategories = jest.fn().mockResolvedValue([]);

      // Mock jwt.sign
      jwt.sign.mockReturnValue('mock-token');

      // Call controller
      await authController.register(req, res);

      // Check User.create was called with correct data
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }));

      // Check jwt.sign was called
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Check response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'userRegistered',
        data: {
          user: expect.objectContaining({
            id: 1,
            username: 'testuser'
          }),
          token: 'mock-token'
        }
      }));
    });

    test('should return error if user already exists', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true)
      });

      // Mock request body
      req.body = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock User.findByUsernameOrEmail to return an existing user
      User.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        username: 'existinguser',
        email: 'existing@example.com'
      });

      // Call controller
      await authController.register(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'auth:userExists'
      }));
    });

    test('should return error if validation fails', async () => {
      // Mock validation result with errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue([{ msg: 'Username is required' }])
      });

      // Call controller
      await authController.register(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'validationError',
        errors: [{ msg: 'Username is required' }]
      }));
    });
  });

  describe('login', () => {
    test('should login user and return token', async () => {
      // Mock authenticated user (set by passport middleware)
      req.user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        preferred_language: 'en'
      };

      // Mock jwt.sign
      jwt.sign.mockReturnValue('mock-token');

      // Call controller
      await authController.login(req, res);

      // Check jwt.sign was called
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: {
          user: expect.objectContaining({
            id: 1,
            username: 'testuser'
          }),
          token: 'mock-token'
        }
      }));
    });
  });

  describe('changePassword', () => {
    test('should change password if current password is correct', async () => {
      // Mock request
      req.user = { id: 1, username: 'testuser' };
      req.body = { currentPassword: 'currentpass', newPassword: 'newpass123' };

      // Mock User.findByUsernameOrEmail
      User.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashedcurrentpass'
      });

      // Mock User.comparePassword
      User.comparePassword.mockResolvedValue(true);

      // Mock User.updatePassword
      User.updatePassword.mockResolvedValue(true);

      // Call controller
      await authController.changePassword(req, res);

      // Check User.comparePassword was called with correct parameters
      expect(User.comparePassword).toHaveBeenCalledWith('currentpass', 'hashedcurrentpass');

      // Check User.updatePassword was called with correct parameters
      expect(User.updatePassword).toHaveBeenCalledWith(1, 'newpass123');

      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'passwordChanged'
      }));
    });

    test('should return error if current password is incorrect', async () => {
      // Mock request
      req.user = { id: 1, username: 'testuser' };
      req.body = { currentPassword: 'wrongpass', newPassword: 'newpass123' };

      // Mock User.findByUsernameOrEmail
      User.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: 'hashedcurrentpass'
      });

      // Mock User.comparePassword to return false (wrong password)
      User.comparePassword.mockResolvedValue(false);

      // Call controller
      await authController.changePassword(req, res);

      // Check User.comparePassword was called
      expect(User.comparePassword).toHaveBeenCalledWith('wrongpass', 'hashedcurrentpass');

      // Check User.updatePassword was NOT called
      expect(User.updatePassword).not.toHaveBeenCalled();

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'auth:incorrectPassword'
      }));
    });
  });

  describe('getProfile', () => {
    test('should return user profile with preferred categories', async () => {
      // Mock request
      req.user = { id: 1 };

      // Mock User.findById
      User.findById.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        preferred_language: 'en',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Mock User.getPreferredCategories
      User.getPreferredCategories.mockResolvedValue([
        { id: 1, name: 'Music' },
        { id: 2, name: 'Technology' }
      ]);

      // Call controller
      await authController.getProfile(req, res);

      // Check User.findById was called with correct ID
      expect(User.findById).toHaveBeenCalledWith(1);

      // Check User.getPreferredCategories was called with correct ID
      expect(User.getPreferredCategories).toHaveBeenCalledWith(1);

      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: {
          user: expect.objectContaining({
            id: 1,
            username: 'testuser',
            preferredCategories: expect.arrayContaining([
              expect.objectContaining({ id: 1, name: 'Music' }),
              expect.objectContaining({ id: 2, name: 'Technology' })
            ])
          })
        }
      }));
    });
  });
});