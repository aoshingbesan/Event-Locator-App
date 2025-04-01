const express = require('express');
// Make sure body-parser is installed
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Locator API',
      version: '1.0.0',
      description: 'API for locating and managing events based on user location',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// IMPORTANT: Apply middleware in the correct order
// Apply CORS middleware first
app.use(cors());

// CRITICAL: Apply JSON parsing middleware
// Using body-parser explicitly to ensure it works
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug middleware to verify request body parsing
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// In-memory storage
const users = [];
const events = [];
let eventIdCounter = 1;

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns a welcome message
 *     responses:
 *       200:
 *         description: Welcome message
 */
app.get('/', (req, res) => {
  res.send('Event Locator API is running');
});

/**
 * @swagger
 * /test:
 *   get:
 *     summary: Test GET endpoint
 *     description: Simple GET endpoint for testing the API
 *     responses:
 *       200:
 *         description: Test successful
 */
app.get('/test', (req, res) => {
  res.json({ 
    message: 'GET test endpoint works',
    info: 'This is a test endpoint for GET requests',
    apiEndpoints: [
      'POST /api/auth/register - Register a new user',
      'POST /api/auth/login - Login',
      'GET /api/events - Get all events',
      'POST /api/events - Create a new event',
      'GET /api/events/search/location - Search events by location'
    ]
  });
});

/**
 * @swagger
 * /test:
 *   post:
 *     summary: Test POST endpoint
 *     description: Simple POST endpoint for testing the API
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Test successful
 */
app.post('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint works',
    receivedBody: req.body
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with location data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 */
app.post('/api/auth/register', (req, res) => {
  try {
    // Safety check for undefined body
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }
    
    const { username, email, password, fullName, latitude, longitude } = req.body;
    
    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = users.find(user => user.email === email || user.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Simple password hashing (not secure for production)
    const hashedPassword = password + '_hashed';
    
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      fullName,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      preferences: {
        preferredCategories: [],
        preferredLanguages: ['en'],
        notificationRadius: 10,
        notificationsEnabled: true
      },
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate a user and return a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usernameOrEmail
 *               - password
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
app.post('/api/auth/login', (req, res) => {
  try {
    // Safety check for undefined body
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }
    
    const { usernameOrEmail, password } = req.body;
    
    // Validation
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Find user by username or email
    const user = users.find(user => 
      user.username === usernameOrEmail || 
      user.email === usernameOrEmail
    );
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password (simple version for in-memory store)
    const isMatch = user.password === password + '_hashed';
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create a token (simplified version)
    const token = `token_${user.id}_${Date.now()}`;
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/preferences/{userId}:
 *   post:
 *     summary: Set user preferences
 *     description: Set preferences for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               preferredLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *               notificationRadius:
 *                 type: number
 *               notificationsEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
app.post('/api/users/preferences/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userIndex = users.findIndex(u => u.id === parseInt(userId));
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { 
      preferredCategories, 
      preferredLanguages,
      notificationRadius,
      notificationsEnabled 
    } = req.body;
    
    // Initialize preferences object if it doesn't exist
    if (!users[userIndex].preferences) {
      users[userIndex].preferences = {};
    }
    
    // Update preferences if provided
    if (preferredCategories) users[userIndex].preferences.preferredCategories = preferredCategories;
    if (preferredLanguages) users[userIndex].preferences.preferredLanguages = preferredLanguages;
    if (notificationRadius !== undefined) users[userIndex].preferences.notificationRadius = notificationRadius;
    if (notificationsEnabled !== undefined) users[userIndex].preferences.notificationsEnabled = notificationsEnabled;
    
    // Don't send password back
    const { password, ...userWithoutPassword } = users[userIndex];
    
    res.status(200).json({
      message: 'Preferences updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/preferences/{userId}:
 *   get:
 *     summary: Get user preferences
 *     description: Get preferences for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User preferences
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
app.get('/api/users/preferences/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.id === parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return preferences if they exist, otherwise return empty object
    const preferences = user.preferences || {};
    
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     description: Create a new event with location data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - startDate
 *               - latitude
 *               - longitude
 *               - organizerId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               organizerId:
 *                 type: integer
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
app.post('/api/events', (req, res) => {
  try {
    const { 
      title, 
      description, 
      category,
      startDate,
      endDate,
      latitude, 
      longitude,
      address,
      organizerId,
      languages = ['en'] // Default language is English
    } = req.body;

    // Validation
    if (!title || !description || !startDate || !latitude || !longitude || !organizerId || !category) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Create new event
    const newEvent = {
      id: eventIdCounter++,
      title,
      description,
      category,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      organizerId,
      languages,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    events.push(newEvent);

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     description: Retrieve all events with optional filtering
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by event category
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by supported language
 *     responses:
 *       200:
 *         description: List of events
 *       500:
 *         description: Server error
 */
app.get('/api/events', (req, res) => {
  try {
    // Optional filtering by category
    const { category, language } = req.query;
    
    let filteredEvents = [...events];
    
    if (category) {
      filteredEvents = filteredEvents.filter(event => event.category === category);
    }
    
    if (language) {
      filteredEvents = filteredEvents.filter(event => event.languages.includes(language));
    }
    
    res.status(200).json({
      count: filteredEvents.length,
      events: filteredEvents
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events/{eventId}:
 *   get:
 *     summary: Get event by ID
 *     description: Retrieve a specific event by its ID
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
app.get('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const event = events.find(e => e.id === parseInt(eventId));
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events/{eventId}:
 *   put:
 *     summary: Update an event
 *     description: Update an existing event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to update
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
app.put('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const eventIndex = events.findIndex(e => e.id === parseInt(eventId));
    
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const { 
      title, 
      description, 
      category,
      startDate,
      endDate,
      latitude, 
      longitude,
      address,
      languages
    } = req.body;
    
    // Update event properties if provided
    const updatedEvent = { ...events[eventIndex] };
    
    if (title) updatedEvent.title = title;
    if (description) updatedEvent.description = description;
    if (category) updatedEvent.category = category;
    if (startDate) updatedEvent.startDate = new Date(startDate);
    if (endDate) updatedEvent.endDate = new Date(endDate);
    if (languages) updatedEvent.languages = languages;
    if (address) updatedEvent.address = address;
    
    // Update location if both latitude and longitude are provided
    if (latitude && longitude) {
      updatedEvent.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }
    
    updatedEvent.updatedAt = new Date();
    
    // Replace the event in the array
    events[eventIndex] = updatedEvent;
    
    res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events/{eventId}:
 *   delete:
 *     summary: Delete an event
 *     description: Remove an event from the system
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
app.delete('/api/events/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const eventIndex = events.findIndex(e => e.id === parseInt(eventId));
    
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Remove the event from the array
    const deletedEvent = events.splice(eventIndex, 1)[0];
    
    res.status(200).json({
      message: 'Event deleted successfully',
      event: deletedEvent
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/events/search/location:
 *   get:
 *     summary: Search events by location
 *     description: Find events near a specific location
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by event category
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by supported language
 *     responses:
 *       200:
 *         description: List of nearby events
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
app.get('/api/events/search/location', (req, res) => {
  try {
    const { latitude, longitude, radius = 10, category, language } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }
    
    // Convert parameters to numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    
    // Function to calculate distance between two points using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance in km
      return distance;
    }
    
    // Filter events by distance
    let nearbyEvents = events.filter(event => {
      // Skip events without valid coordinates
      if (!event.location || !event.location.coordinates || 
          !event.location.coordinates[0] || !event.location.coordinates[1]) {
        return false;
      }
      
      const eventLng = event.location.coordinates[0];
      const eventLat = event.location.coordinates[1];
      const distance = calculateDistance(lat, lng, eventLat, eventLng);
      
      // Add distance to the event object for sorting
      event.distance = distance;
      
      return distance <= radiusKm;
    });
    
    // Apply additional filters if provided
    if (category) {
      nearbyEvents = nearbyEvents.filter(event => event.category === category);
    }
    
    if (language) {
      nearbyEvents = nearbyEvents.filter(event => event.languages.includes(language));
    }
    
    // Sort by distance (closest first)
    nearbyEvents.sort((a, b) => a.distance - b.distance);
    
    res.status(200).json({
      count: nearbyEvents.length,
      events: nearbyEvents
    });
  } catch (error) {
    console.error('Location search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/languages:
 *   get:
 *     summary: Get supported languages
 *     description: Returns a list of supported languages for multilingual support
 *     responses:
 *       200:
 *         description: List of supported languages
 */
app.get('/api/languages', (req, res) => {
  res.json({
    supported: ['en', 'es', 'fr', 'zh', 'ar']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger documentation: http://localhost:${PORT}/api-docs`);
  console.log(`API endpoints:`);
  console.log(`- GET http://localhost:${PORT}/`);
  console.log(`- GET http://localhost:${PORT}/test`);
  console.log(`- POST http://localhost:${PORT}/test`);
  console.log(`- POST http://localhost:${PORT}/api/auth/register`);
  console.log(`- POST http://localhost:${PORT}/api/auth/login`);
  console.log(`- GET http://localhost:${PORT}/api/users/preferences/:userId`);
  console.log(`- POST http://localhost:${PORT}/api/users/preferences/:userId`);
  console.log(`- GET http://localhost:${PORT}/api/events`);
  console.log(`- POST http://localhost:${PORT}/api/events`);
  console.log(`- GET http://localhost:${PORT}/api/events/:eventId`);
  console.log(`- PUT http://localhost:${PORT}/api/events/:eventId`);
  console.log(`- DELETE http://localhost:${PORT}/api/events/:eventId`);
  console.log(`- GET http://localhost:${PORT}/api/events/search/location`);
  console.log(`- GET http://localhost:${PORT}/api/languages`);
});