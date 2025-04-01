require('dotenv').config();
const { Pool } = require('pg');

// Database connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Initialize the database with PostGIS extension
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    try {
      // Enable PostGIS extension
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('PostGIS extension enabled successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Helper function to convert lat/lng to PostGIS geography point
const toGeographyPoint = (latitude, longitude) => {
  return `POINT(${longitude} ${latitude})`;
};

// Helper function to convert PostGIS geography point to lat/lng object
const fromGeographyPoint = (point) => {
  if (!point) return null;
  
  const match = point.match(/POINT\((.+) (.+)\)/);
  if (match) {
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);
    return { latitude, longitude };
  }
  return null;
};

// Export pool and helper functions
module.exports = {
  pool,
  initializeDatabase,
  toGeographyPoint,
  fromGeographyPoint,
  query: (text, params) => pool.query(text, params),
};