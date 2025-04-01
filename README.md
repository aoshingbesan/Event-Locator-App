# Event Locator App

A full-featured application for discovering and managing events based on location and user preferences.

## Features

### User Authentication & Preferences
- User registration and login
- Location-based profiles
- Customizable preferences for event categories and languages
- Notification radius settings

### Event Management
- Create, read, update, and delete events
- Rich event details including location, time, and multilingual support
- Category-based organization

### Location Services
- Find events near your current location
- Radius-based search with distance sorting
- Map integration for visual discovery

### Multilingual Support
- Support for multiple languages (English, Spanish, French, Chinese, Arabic)
- User language preferences
- Events with language indicators

## Technology Stack

### Backend
- **Node.js** with Express framework
- **PostgreSQL** with PostGIS extensions for geospatial data
- **Redis** for caching and session management
- **Docker** for containerization

### API Features
- RESTful architecture
- Swagger UI documentation
- JWT authentication
- Geospatial queries

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Docker and Docker Compose
- PostgreSQL with PostGIS extension
- Redis

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/event-locator-app.git
cd event-locator-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the database containers:
```bash
docker-compose up -d
```

4. Create database schema:
```bash
psql -h localhost -p 5433 -U postgres -d event_locator -f database-schema.sql
```

5. Start the application:
```bash
npm start
```

The server will run on http://localhost:3000 by default.

## API Documentation

API documentation is available via Swagger UI at http://localhost:3000/api-docs when the server is running.

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive authentication token

#### User Preferences
- `GET /api/users/preferences/:userId` - Get user preferences
- `POST /api/users/preferences/:userId` - Update user preferences

#### Events
- `GET /api/events` - List all events (with optional filtering)
- `POST /api/events` - Create a new event
- `GET /api/events/:eventId` - Get event details
- `PUT /api/events/:eventId` - Update an event
- `DELETE /api/events/:eventId` - Delete an event

#### Location-based Search
- `GET /api/events/search/location` - Find events near coordinates

#### Multilingual Support
- `GET /api/languages` - Get list of supported languages

## Database Schema

The application uses PostgreSQL with PostGIS extension for geospatial functionality. Key tables include:

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100),
    location GEOGRAPHY(Point,4326),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Events Table
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    location GEOGRAPHY(Point,4326) NOT NULL,
    address VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

Additional tables include:
- `categories`
- `event_categories`
- `event_reviews`
- `user_favorite_events`
- `user_preferred_categories`

## Testing

The application includes comprehensive unit tests for all core functionalities.

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage reports
```

Test categories include:
- Authentication and user management
- Event CRUD operations
- Location-based search functionality 
- Multilingual support

## Project Structure

```
event-locator-app/
├── server.js                  # Main application entry point
├── database-schema.sql        # SQL schema definition
├── docker-compose.yml         # Docker configuration
├── package.json               # Project dependencies
├── swagger.js                 # Swagger configuration
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   │   ├── auth.test.js       # Authentication tests
│   │   ├── events.test.js     # Event management tests
│   │   ├── location.test.js   # Location search tests
│   │   └── i18n.test.js       # Multilingual support tests
└── node_modules/              # Installed packages
```

## Implementation Details

### Geospatial Features
- PostgreSQL with PostGIS extension provides powerful geospatial capabilities
- Location data is stored as GeoJSON points
- Spatial indexing for efficient proximity queries

### Authentication Flow
1. User registers with credentials and location
2. Server validates input and creates user record
3. User logs in to receive JWT token
4. Token is used for authenticated requests

### Multilingual Support
- API responses adapt to user language preferences
- Events can be created with multiple language support
- Filtering by language capability is supported

## Future Enhancements

Planned future improvements:
- Mobile app integration
- Real-time notifications for nearby events
- Social features (following, sharing)
- Advanced search filters
- Image uploads for events
- Calendar integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PostgreSQL and PostGIS teams for excellent geospatial database support
- Express.js for the web framework
- Swagger for API documentation