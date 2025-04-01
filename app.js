const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const passport = require('./config/passport');
const initI18n = require('./middlewares/i18n');
const { i18next, i18nextMiddleware } = initI18n();

const db = require('./config/database');
db.query('SELECT NOW()', [])
  .then(result => console.log('Database connection successful:', result.rows[0]))
  .catch(err => console.error('Database connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const searchRoutes = require('./routes/search');

// Initialize app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Logging

// Internationalization
app.use(i18nextMiddleware);

// Initialize Passport
app.use(passport.initialize());

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/search', searchRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: req.t('welcome'),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error(req.t('notFound'));
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = error.message || req.t('serverError');
  
  res.status(status).json({
    success: false,
    message: message
  });
});

module.exports = app;