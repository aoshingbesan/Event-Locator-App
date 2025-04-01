const User = require('../../models/User');
const db = require('../../config/database');

// Mock modules
jest.mock('../../config/database');
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn()
}));

// Import bcrypt after mocking
const bcrypt = require('bcrypt');

describe('User Model', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should create a new user with location', async () => {
      // Mock data
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        latitude: 37.7749,
        longitude: -122.4194,
        preferredLanguage: 'en'
      };

      // Mock database response
      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          full_name: 'Test User',
          preferred_language: 'en',
          location: 'POINT(-122.4194 37.7749)',
          created_at: new Date()
        }]
      });

      // Mock fromGeographyPoint
      db.fromGeographyPoint.mockReturnValue({
        latitude: 37.7749,
        longitude: -122.4194
      });

      // Call the function
      const result = await User.create(userData);

      // Check bcrypt was called with correct parameters
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      // Check query was called with correct parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'testuser',
          'test@example.com',
          expect.any(String), // Hashed password
          'Test User',
          'en',
          37.7749,
          -122.4194
        ])
      );

      // Check result
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        preferred_language: 'en',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      }));
    });

    test('should create a new user without location', async () => {
      // Mock data
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      // Mock database response
      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          full_name: 'Test User',
          preferred_language: 'en',
          location: null,
          created_at: new Date()
        }]
      });

      // Call the function
      const result = await User.create(userData);

      // Check query was called with correct parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'testuser',
          'test@example.com',
          expect.any(String), // Hashed password
          'Test User',
          'en'
        ])
      );

      // Check result
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        preferred_language: 'en',
        location: null
      }));
    });
  });

  describe('findByUsernameOrEmail', () => {
    test('should find user by username', async () => {
      // Mock database response
      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedpassword',
          full_name: 'Test User',
          preferred_language: 'en',
          location: 'POINT(-122.4194 37.7749)',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      // Mock fromGeographyPoint
      db.fromGeographyPoint.mockReturnValue({
        latitude: 37.7749,
        longitude: -122.4194
      });

      // Call the function
      const result = await User.findByUsernameOrEmail('testuser');

      // Check query was called with correct parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['testuser']
      );

      // Check result
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        full_name: 'Test User',
        preferred_language: 'en',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      }));
    });

    test('should return null if user not found', async () => {
      // Mock database response
      db.query.mockResolvedValue({
        rows: []
      });

      // Call the function
      const result = await User.findByUsernameOrEmail('nonexistent');

      // Check result
      expect(result).toBeNull();
    });
  });

  describe('comparePassword', () => {
    test('should return true if password matches', async () => {
      // Mock bcrypt.compare to return true
      bcrypt.compare.mockResolvedValueOnce(true);

      // Call the function
      const result = await User.comparePassword('password123', 'hashedpassword');

      // Check bcrypt was called with correct parameters
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');

      // Check result
      expect(result).toBe(true);
    });

    test('should return false if password does not match', async () => {
      // Mock bcrypt.compare to return false
      bcrypt.compare.mockResolvedValueOnce(false);

      // Call the function
      const result = await User.comparePassword('wrongpassword', 'hashedpassword');

      // Check result
      expect(result).toBe(false);
    });
  });
});