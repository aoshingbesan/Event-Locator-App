// Setup environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DEFAULT_LATITUDE = '37.7749';
process.env.DEFAULT_LONGITUDE = '-122.4194';
process.env.DEFAULT_SEARCH_RADIUS = '10';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockResolvedValue({ id: 1 })
}));