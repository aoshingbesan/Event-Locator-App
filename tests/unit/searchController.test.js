const searchController = require('../../controllers/searchController');
const Event = require('../../models/Event');
const Category = require('../../models/Category');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../../models/Event');
jest.mock('../../models/Category');
jest.mock('express-validator');

describe('Search Controller', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      query: {},
      t: jest.fn().mockImplementation(key => key) // Mock i18n translation function
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Set environment variables for testing
    process.env.DEFAULT_LATITUDE = '37.7749';
    process.env.DEFAULT_LONGITUDE = '-122.4194';
    process.env.DEFAULT_SEARCH_RADIUS = '10';
  });

  describe('searchByLocation', () => {
    test('should search events by provided location and parameters', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true)
      });

      // Mock request query
      req.query = {
        latitude: '37.7749',
        longitude: '-122.4194',
        radius: '5',
        categories: ['1', '2'],
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        page: '1',
        limit: '10'
      };

      // Mock Event.searchByLocation
      Event.searchByLocation.mockResolvedValue({
        events: [
          {
            id: 1,
            title: 'Event 1',
            description: 'Description 1',
            location: { latitude: 37.78, longitude: -122.42 },
            address: 'Address 1',
            start_time: '2023-01-01T12:00:00Z',
            categories: [{ id: 1, name: 'Music' }],
            distance_km: '1.20'
          },
          {
            id: 2,
            title: 'Event 2',
            description: 'Description 2',
            location: { latitude: 37.76, longitude: -122.40 },
            address: 'Address 2',
            start_time: '2023-01-02T12:00:00Z',
            categories: [{ id: 2, name: 'Technology' }],
            distance_km: '2.50'
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1
        }
      });

      // Call controller
      await searchController.searchByLocation(req, res);

      // Check Event.searchByLocation was called with correct parameters
      expect(Event.searchByLocation).toHaveBeenCalledWith({
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 5,
        categoryIds: [1, 2],
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        page: 1,
        limit: 10
      });

      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: {
          searchParameters: expect.objectContaining({
            latitude: 37.7749,
            longitude: -122.4194,
            radius: 5
          }),
          events: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: 'Event 1',
              distance_km: '1.20'
            }),
            expect.objectContaining({
              id: 2,
              title: 'Event 2',
              distance_km: '2.50'
            })
          ]),
          pagination: expect.objectContaining({
            total: 2,
            page: 1,
            limit: 10,
            pages: 1
          })
        }
      }));
    });

    test('should use user location if available and coordinates not provided', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true)
      });

      // Mock request with authenticated user but no coordinates
      req.query = {
        radius: '5'
      };
      req.user = {
        location: {
          latitude: 38.5,
          longitude: -121.5
        }
      };

      // Mock Event.searchByLocation
      Event.searchByLocation.mockResolvedValue({
        events: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      });

      // Call controller
      await searchController.searchByLocation(req, res);

      // Check Event.searchByLocation was called with user's location
      expect(Event.searchByLocation).toHaveBeenCalledWith(expect.objectContaining({
        latitude: 38.5,
        longitude: -121.5
      }));
    });

    test('should use default location if no coordinates or user location', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true)
      });

      // Mock request with no coordinates and no user location
      req.query = {
        radius: '5'
      };
      // No req.user

      // Mock Event.searchByLocation
      Event.searchByLocation.mockResolvedValue({
        events: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      });

      // Call controller
      await searchController.searchByLocation(req, res);

      // Check Event.searchByLocation was called with default location
      expect(Event.searchByLocation).toHaveBeenCalledWith(expect.objectContaining({
        latitude: 37.7749,
        longitude: -122.4194
      }));
    });

    test('should return error if validation fails', async () => {
      // Mock validation result with errors
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue([{ msg: 'Latitude must be a number' }])
      });

      // Mock request with invalid data
      req.query = {
        latitude: 'invalid',
        longitude: '-122.4194'
      };

      // Call controller
      await searchController.searchByLocation(req, res);

      // Check Event.searchByLocation was NOT called
      expect(Event.searchByLocation).not.toHaveBeenCalled();

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'validationError',
        errors: [{ msg: 'Latitude must be a number' }]
      }));
    });
  });

  describe('getCategories', () => {
    test('should return all categories', async () => {
      // Mock Category.getAll
      Category.getAll.mockResolvedValue([
        { id: 1, name: 'Music' },
        { id: 2, name: 'Technology' },
        { id: 3, name: 'Sports' }
      ]);

      // Call controller
      await searchController.getCategories(req, res);

      // Check Category.getAll was called
      expect(Category.getAll).toHaveBeenCalled();

      // Check response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: {
          categories: expect.arrayContaining([
            expect.objectContaining({ id: 1, name: 'Music' }),
            expect.objectContaining({ id: 2, name: 'Technology' }),
            expect.objectContaining({ id: 3, name: 'Sports' })
          ])
        }
      }));
    });

    test('should handle error when getting categories', async () => {
      // Mock Category.getAll to throw error
      Category.getAll.mockRejectedValue(new Error('Database error'));

      // Call controller
      await searchController.getCategories(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'serverError'
      }));
    });
  });
});