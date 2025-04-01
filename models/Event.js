const db = require('../config/database');

class Event {
  // Create a new event
  static async create(eventData) {
    const { title, description, latitude, longitude, address, startTime, endTime, creatorId, categories } = eventData;
    
    // Begin transaction to ensure all operations succeed or fail together
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert event
      const eventQuery = `
        INSERT INTO events (title, description, location, address, start_time, end_time, creator_id)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6, $7, $8)
        RETURNING id, title, description, ST_AsText(location) as location, address, 
                  start_time, end_time, creator_id, created_at, updated_at
      `;
      
      const eventValues = [title, description, latitude, longitude, address, startTime, endTime, creatorId];
      const eventResult = await client.query(eventQuery, eventValues);
      const event = eventResult.rows[0];
      
      // Insert event categories if provided
      if (categories && categories.length > 0) {
        const categoryValues = categories.map(categoryId => {
          return `(${event.id}, ${categoryId})`;
        }).join(', ');
        
        await client.query(`
          INSERT INTO event_categories (event_id, category_id)
          VALUES ${categoryValues}
        `);
      }
      
      await client.query('COMMIT');
      
      // Get complete event with categories
      return this.getById(event.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get event by ID with categories
  static async getById(id) {
    const eventQuery = `
      SELECT e.id, e.title, e.description, ST_AsText(e.location) as location, 
             e.address, e.start_time, e.end_time, e.creator_id, 
             e.created_at, e.updated_at
      FROM events e
      WHERE e.id = $1
    `;
    
    const eventResult = await db.query(eventQuery, [id]);
    
    if (eventResult.rows.length === 0) {
      return null;
    }
    
    const event = eventResult.rows[0];
    
    // Convert location string to lat/lng object
    if (event.location) {
      event.location = db.fromGeographyPoint(event.location);
    }
    
    // Get event categories
    const categoriesQuery = `
      SELECT c.id, c.name
      FROM categories c
      JOIN event_categories ec ON c.id = ec.category_id
      WHERE ec.event_id = $1
      ORDER BY c.name
    `;
    
    const categoriesResult = await db.query(categoriesQuery, [id]);
    event.categories = categoriesResult.rows;
    
    return event;
  }
  
  // Update an existing event
  static async update(id, eventData) {
    const { title, description, latitude, longitude, address, startTime, endTime, categories } = eventData;
    
    // Begin transaction
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build the update query dynamically based on provided fields
      let updateQuery = 'UPDATE events SET ';
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      if (title) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      
      if (latitude && longitude) {
        updateFields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geography`);
        values.push(latitude, longitude);
        paramIndex += 2;
      }
      
      if (address) {
        updateFields.push(`address = $${paramIndex++}`);
        values.push(address);
      }
      
      if (startTime) {
        updateFields.push(`start_time = $${paramIndex++}`);
        values.push(startTime);
      }
      
      if (endTime !== undefined) {
        updateFields.push(`end_time = $${paramIndex++}`);
        values.push(endTime);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // If no fields to update, just return the original event
      if (updateFields.length === 1) {
        return this.getById(id);
      }
      
      updateQuery += updateFields.join(', ');
      updateQuery += ` WHERE id = $${paramIndex++} RETURNING id`;
      values.push(id);
      
      await client.query(updateQuery, values);
      
      // Update categories if provided
      if (categories && Array.isArray(categories)) {
        // Delete existing categories associations
        await client.query('DELETE FROM event_categories WHERE event_id = $1', [id]);
        
        // Insert new categories associations
        if (categories.length > 0) {
          const categoryValues = categories.map(categoryId => {
            return `(${id}, ${categoryId})`;
          }).join(', ');
          
          await client.query(`
            INSERT INTO event_categories (event_id, category_id)
            VALUES ${categoryValues}
          `);
        }
      }
      
      await client.query('COMMIT');
      
      // Get updated event with categories
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Delete an event
  static async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }
  
  // Get all events with pagination and filtering
  static async getAll({ page = 1, limit = 10, categoryIds = [], creatorId = null, startDate = null, endDate = null }) {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query conditions
    let conditions = [];
    const values = [];
    let paramIndex = 1;
    
    if (creatorId) {
      conditions.push(`e.creator_id = $${paramIndex++}`);
      values.push(creatorId);
    }
    
    if (startDate) {
      conditions.push(`e.start_time >= $${paramIndex++}`);
      values.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`e.start_time <= $${paramIndex++}`);
      values.push(endDate);
    }
    
    // Build category filter
    let categoryJoin = '';
    if (categoryIds && categoryIds.length > 0) {
      categoryJoin = `
        JOIN event_categories ec ON e.id = ec.event_id
        JOIN categories c ON ec.category_id = c.id
      `;
      conditions.push(`c.id IN (${categoryIds.join(', ')})`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count of matching events for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM events e
      ${categoryJoin}
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    
    // Clone values array for the main query
    const mainQueryValues = [...values];
    
    // Add pagination parameters
    mainQueryValues.push(limit, offset);
    
    // Main query to get events
    const mainQuery = `
      SELECT DISTINCT e.id, e.title, e.description, ST_AsText(e.location) as location, 
             e.address, e.start_time, e.end_time, e.creator_id, 
             e.created_at, e.updated_at
      FROM events e
      ${categoryJoin}
      ${whereClause}
      ORDER BY e.start_time ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    const eventsResult = await db.query(mainQuery, mainQueryValues);
    
    // Get category information for all events
    const events = [];
    for (const event of eventsResult.rows) {
      // Convert location string to lat/lng object
      if (event.location) {
        event.location = db.fromGeographyPoint(event.location);
      }
      
      // Get categories for this event
      const categoriesQuery = `
        SELECT c.id, c.name
        FROM categories c
        JOIN event_categories ec ON c.id = ec.category_id
        WHERE ec.event_id = $1
        ORDER BY c.name
      `;
      
      const categoriesResult = await db.query(categoriesQuery, [event.id]);
      event.categories = categoriesResult.rows;
      
      events.push(event);
    }
    
    return {
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Search for events based on location, radius, and optional filters
  static async searchByLocation({ 
    latitude, 
    longitude, 
    radius = 10, // Default 10km radius
    categoryIds = [], 
    startDate = null, 
    endDate = null,
    page = 1,
    limit = 10
  }) {
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query conditions
    let conditions = [
      `ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
        $1 * 1000 -- Convert km to meters
      )`
    ];
    
    const values = [radius, latitude, longitude];
    let paramIndex = 4;
    
    if (startDate) {
      conditions.push(`e.start_time >= $${paramIndex++}`);
      values.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`e.start_time <= $${paramIndex++}`);
      values.push(endDate);
    }
    
    // Build category filter
    let categoryJoin = '';
    if (categoryIds && categoryIds.length > 0) {
      categoryJoin = `
        JOIN event_categories ec ON e.id = ec.event_id
        JOIN categories c ON ec.category_id = c.id
      `;
      conditions.push(`c.id IN (${categoryIds.join(', ')})`);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get total count of matching events for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM events e
      ${categoryJoin}
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    
    // Clone values array for the main query
    const mainQueryValues = [...values];
    
    // Add pagination parameters
    mainQueryValues.push(limit, offset);
    
    // Main query to get events with distance
    const mainQuery = `
      SELECT DISTINCT e.id, e.title, e.description, ST_AsText(e.location) as location, 
             e.address, e.start_time, e.end_time, e.creator_id, 
             e.created_at, e.updated_at,
             ST_Distance(
               e.location, 
               ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
             ) / 1000 as distance_km
      FROM events e
      ${categoryJoin}
      ${whereClause}
      ORDER BY distance_km ASC, e.start_time ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    const eventsResult = await db.query(mainQuery, mainQueryValues);
    
    // Get category information for all events
    const events = [];
    for (const event of eventsResult.rows) {
      // Convert location string to lat/lng object
      if (event.location) {
        event.location = db.fromGeographyPoint(event.location);
      }
      
      // Round distance to 2 decimal places
      event.distance_km = parseFloat(event.distance_km).toFixed(2);
      
      // Get categories for this event
      const categoriesQuery = `
        SELECT c.id, c.name
        FROM categories c
        JOIN event_categories ec ON c.id = ec.category_id
        WHERE ec.event_id = $1
        ORDER BY c.name
      `;
      
      const categoriesResult = await db.query(categoriesQuery, [event.id]);
      event.categories = categoriesResult.rows;
      
      events.push(event);
    }
    
    return {
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Get average rating for an event
  static async getAverageRating(eventId) {
    const query = `
      SELECT AVG(rating) as average_rating, COUNT(*) as review_count
      FROM event_reviews
      WHERE event_id = $1
    `;
    
    const result = await db.query(query, [eventId]);
    
    return {
      average_rating: result.rows[0].average_rating ? parseFloat(result.rows[0].average_rating).toFixed(1) : null,
      review_count: parseInt(result.rows[0].review_count)
    };
  }
  
  // Check if user has favorited an event
  static async isFavorited(userId, eventId) {
    const query = `
      SELECT 1 FROM user_favorite_events
      WHERE user_id = $1 AND event_id = $2
    `;
    
    const result = await db.query(query, [userId, eventId]);
    return result.rows.length > 0;
  }
  
  // Add review to an event
  static async addReview(eventId, userId, rating, review) {
    // Check if user has already reviewed this event
    const existingReviewQuery = `
      SELECT id FROM event_reviews
      WHERE event_id = $1 AND user_id = $2
    `;
    
    const existingReviewResult = await db.query(existingReviewQuery, [eventId, userId]);
    
    if (existingReviewResult.rows.length > 0) {
      // Update existing review
      const updateQuery = `
        UPDATE event_reviews
        SET rating = $3, review = $4, updated_at = CURRENT_TIMESTAMP
        WHERE event_id = $1 AND user_id = $2
        RETURNING id, event_id, user_id, rating, review, created_at, updated_at
      `;
      
      const result = await db.query(updateQuery, [eventId, userId, rating, review]);
      return result.rows[0];
    } else {
      // Create new review
      const insertQuery = `
        INSERT INTO event_reviews (event_id, user_id, rating, review)
        VALUES ($1, $2, $3, $4)
        RETURNING id, event_id, user_id, rating, review, created_at, updated_at
      `;
      
      const result = await db.query(insertQuery, [eventId, userId, rating, review]);
      return result.rows[0];
    }
  }
  
  // Get reviews for an event
  static async getReviews(eventId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Get total count of reviews
    const countQuery = `
      SELECT COUNT(*) as total
      FROM event_reviews
      WHERE event_id = $1
    `;
    
    const countResult = await db.query(countQuery, [eventId]);
    const total = parseInt(countResult.rows[0].total);
    
    // Get reviews with user information
    const reviewsQuery = `
      SELECT er.id, er.event_id, er.user_id, er.rating, er.review, 
             er.created_at, er.updated_at, u.username, u.full_name
      FROM event_reviews er
      JOIN users u ON er.user_id = u.id
      WHERE er.event_id = $1
      ORDER BY er.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const reviewsResult = await db.query(reviewsQuery, [eventId, limit, offset]);
    
    return {
      reviews: reviewsResult.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Favorite an event
  static async favoriteEvent(userId, eventId) {
    const query = `
      INSERT INTO user_favorite_events (user_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, event_id) DO NOTHING
      RETURNING user_id, event_id, created_at
    `;
    
    const result = await db.query(query, [userId, eventId]);
    return result.rows[0];
  }
  
  // Unfavorite an event
  static async unfavoriteEvent(userId, eventId) {
    const query = `
      DELETE FROM user_favorite_events
      WHERE user_id = $1 AND event_id = $2
      RETURNING user_id, event_id
    `;
    
    const result = await db.query(query, [userId, eventId]);
    return result.rows.length > 0;
  }
  
  // Get user's favorite events
  static async getUserFavorites(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_favorite_events ufe
      WHERE ufe.user_id = $1
    `;
    
    const countResult = await db.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);
    
    // Get favorite events
    const eventsQuery = `
      SELECT e.id, e.title, e.description, ST_AsText(e.location) as location, 
             e.address, e.start_time, e.end_time, e.creator_id, 
             e.created_at, e.updated_at, ufe.created_at as favorited_at
      FROM events e
      JOIN user_favorite_events ufe ON e.id = ufe.event_id
      WHERE ufe.user_id = $1
      ORDER BY ufe.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const eventsResult = await db.query(eventsQuery, [userId, limit, offset]);
    
    // Get category information for all events
    const events = [];
    for (const event of eventsResult.rows) {
      // Convert location string to lat/lng object
      if (event.location) {
        event.location = db.fromGeographyPoint(event.location);
      }
      
      // Get categories for this event
      const categoriesQuery = `
        SELECT c.id, c.name
        FROM categories c
        JOIN event_categories ec ON c.id = ec.category_id
        WHERE ec.event_id = $1
        ORDER BY c.name
      `;
      
      const categoriesResult = await db.query(categoriesQuery, [event.id]);
      event.categories = categoriesResult.rows;
      
      events.push(event);
    }
    
    return {
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Event;