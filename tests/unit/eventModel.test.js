const Event = require('../../models/Event');
const db = require('../../config/database');

// Mock database module
jest.mock('../../config/database');

describe('Event Model', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should create a new event with categories', async () => {
      // Mock data
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Test St, Test City',
        startTime: '2023-01-01T12:00:00Z',
        endTime: '2023-01-01T15:00:00Z',
        creatorId: 1,
        categories: [1, 2]
      };

      // Mock client
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      // Mock pool connect
      db.pool.connect.mockResolvedValue(mockClient);

      // Mock client queries
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve();
        } else if (query === 'COMMIT') {
          return Promise.resolve();
        } else if (query.includes('INSERT INTO events')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              title: 'Test Event',
              description: 'Test Description',
              location: 'POINT(-122.4194 37.7749)',
              address: '123 Test St, Test City',
              start_time: '2023-01-01T12:00:00Z',
              end_time: '2023-01-01T15:00:00Z',
              creator_id: 1,
              created_at: new Date(),
              updated_at: new Date()
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock getById for returning complete event
      const mockEvent = {
        id: 1,
        title: 'Test Event',
        description: 'Test Description',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        address: '123 Test St, Test City',
        start_time: '2023-01-01T12:00:00Z',
        end_time: '2023-01-01T15:00:00Z',
        creator_id: 1,
        categories: [
          { id: 1, name: 'Music' },
          { id: 2, name: 'Technology' }
        ],
        created_at: new Date(),
        updated_at: new Date()
      };
      
      Event.getById = jest.fn().mockResolvedValue(mockEvent);

      // Call the function
      const result = await Event.create(eventData);

      // Check pool.connect was called
      expect(db.pool.connect).toHaveBeenCalled();

      // Check transaction was started
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');

      // Check event was inserted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        expect.arrayContaining([
          'Test Event',
          'Test Description',
          37.7749,
          -122.4194,
          '123 Test St, Test City',
          '2023-01-01T12:00:00Z',
          '2023-01-01T15:00:00Z',
          1
        ])
      );

      // Check categories were inserted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_categories')
      );

      // Check transaction was committed
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Check client was released
      expect(mockClient.release).toHaveBeenCalled();

      // Check getById was called to return complete event
      expect(Event.getById).toHaveBeenCalledWith(1);

      // Check result
      expect(result).toEqual(mockEvent);
    });
  });

  describe('searchByLocation', () => {
    test('should search events by location', async () => {
      // Mock data
      const searchParams = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 10,
        page: 1,
        limit: 10
      };

      // Mock count query result
      db.query.mockImplementation((query, params) => {
        if (query.includes('COUNT')) {
          return Promise.resolve({
            rows: [{ total: '2' }]
          });
        } else if (query.includes('ST_Distance')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Event 1',
                description: 'Description 1',
                location: 'POINT(-122.42 37.78)',
                address: 'Address 1',
                start_time: '2023-01-01T12:00:00Z',
                end_time: '2023-01-01T15:00:00Z',
                creator_id: 1,
                created_at: new Date(),
                updated_at: new Date(),
                distance_km: '1.2'
              },
              {
                id: 2,
                title: 'Event 2',
                description: 'Description 2',
                location: 'POINT(-122.40 37.76)',
                address: 'Address 2',
                start_time: '2023-01-02T12:00:00Z',
                end_time: '2023-01-02T15:00:00Z',
                creator_id: 2,
                created_at: new Date(),
                updated_at: new Date(),
                distance_km: '2.5'
              }
            ]
          });
        } else if (query.includes('SELECT c.id, c.name')) {
          // Mock categories query
          return Promise.resolve({
            rows: [
              { id: 1, name: 'Music' },
              { id: 2, name: 'Technology' }
            ]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // Mock fromGeographyPoint
      db.fromGeographyPoint.mockImplementation((point) => {
        if (point === 'POINT(-122.42 37.78)') {
          return { latitude: 37.78, longitude: -122.42 };
        } else if (point === 'POINT(-122.40 37.76)') {
          return { latitude: 37.76, longitude: -122.40 };
        }
        return null;
      });

      // Call the function
      const result = await Event.searchByLocation(searchParams);

      // Check queries were called with correct parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        expect.arrayContaining([10, 37.7749, -122.4194])
      );

      // Check result format
      expect(result).toEqual({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Event 1',
            distance_km: '1.20',
            location: { latitude: 37.78, longitude: -122.42 },
            categories: expect.arrayContaining([
              expect.objectContaining({ id: 1, name: 'Music' })
            ])
          }),
          expect.objectContaining({
            id: 2,
            title: 'Event 2',
            distance_km: '2.50',
            location: { latitude: 37.76, longitude: -122.40 },
            categories: expect.arrayContaining([
              expect.objectContaining({ id: 1, name: 'Music' })
            ])
          })
        ]),
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });
  });
});