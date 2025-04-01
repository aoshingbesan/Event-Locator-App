const redis = require('redis');
require('dotenv').config();

// Create Redis client
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

// Handle Redis connection errors
client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Promisify Redis methods
const publish = (channel, message) => {
  return new Promise((resolve, reject) => {
    client.publish(channel, JSON.stringify(message), (err, reply) => {
      if (err) return reject(err);
      resolve(reply);
    });
  });
};

// Create a subscriber client (for notification service)
const createSubscriber = () => {
  const subscriber = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  });

  // Handle subscriber connection errors
  subscriber.on('error', (err) => {
    console.error('Redis subscriber connection error:', err);
  });

  return subscriber;
};

// Message queue channels
const CHANNELS = {
  EVENT_NOTIFICATIONS: 'event-notifications',
  EVENT_REMINDERS: 'event-reminders'
};

module.exports = {
  client,
  publish,
  createSubscriber,
  CHANNELS
};