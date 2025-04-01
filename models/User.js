const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Create a new user
  static async create(userData) {
    const { username, email, password, fullName, latitude, longitude, preferredLanguage = 'en' } = userData;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Convert latitude/longitude to PostGIS point if provided
    let locationQuery = 'NULL';
    if (latitude && longitude) {
      locationQuery = `ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography`;
    }
    
    const query = `
      INSERT INTO users (username, email, password, full_name, preferred_language, location)
      VALUES ($1, $2, $3, $4, $5, ${locationQuery})
      RETURNING id, username, email, full_name, preferred_language, 
                ST_AsText(location) as location, created_at
    `;
    
    const values = [username, email, hashedPassword, fullName, preferredLanguage];
    if (latitude && longitude) {
      values.push(latitude, longitude);
    }
    
    const result = await db.query(query, values);
    const user = result.rows[0];
    
    // Convert location string to lat/lng object
    if (user.location) {
      user.location = db.fromGeographyPoint(user.location);
    }
    
    return user;
  }
  
  // Find user by username or email
  static async findByUsernameOrEmail(usernameOrEmail) {
    const query = `
      SELECT id, username, email, password, full_name, preferred_language, 
             ST_AsText(location) as location, created_at, updated_at
      FROM users
      WHERE username = $1 OR email = $1
    `;
    
    const result = await db.query(query, [usernameOrEmail]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    // Convert location string to lat/lng object
    if (user.location) {
      user.location = db.fromGeographyPoint(user.location);
    }
    
    return user;
  }
  
  // Find user by ID
  static async findById(id) {
    const query = `
      SELECT id, username, email, full_name, preferred_language, 
             ST_AsText(location) as location, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    // Convert location string to lat/lng object
    if (user.location) {
      user.location = db.fromGeographyPoint(user.location);
    }
    
    return user;
  }
  
  // Update user
  static async update(id, userData) {
    const { username, email, fullName, preferredLanguage, latitude, longitude } = userData;
    
    // Build the query dynamically based on provided fields
    let query = 'UPDATE users SET ';
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (username) {
      updateFields.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    
    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (fullName) {
      updateFields.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }
    
    if (preferredLanguage) {
      updateFields.push(`preferred_language = $${paramIndex++}`);
      values.push(preferredLanguage);
    }
    
    if (latitude && longitude) {
      updateFields.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geography`);
      values.push(latitude, longitude);
      paramIndex += 2;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // If no fields to update, return the original user
    if (updateFields.length === 1) {
      return this.findById(id);
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING id, username, email, full_name, preferred_language, ST_AsText(location) as location, created_at, updated_at`;
    values.push(id);
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    // Convert location string to lat/lng object
    if (user.location) {
      user.location = db.fromGeographyPoint(user.location);
    }
    
    return user;
  }
  
  // Update user password
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const query = `
      UPDATE users
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await db.query(query, [hashedPassword, id]);
    return true;
  }
  
  // Set user preferred categories
  static async setPreferredCategories(userId, categoryIds) {
    // First delete existing preferences
    await db.query('DELETE FROM user_preferred_categories WHERE user_id = $1', [userId]);
    
    // Insert new preferences
    if (categoryIds && categoryIds.length > 0) {
      const values = categoryIds.map(categoryId => `(${userId}, ${categoryId})`).join(', ');
      await db.query(`
        INSERT INTO user_preferred_categories (user_id, category_id)
        VALUES ${values}
      `);
    }
    
    return this.getPreferredCategories(userId);
  }
  
  // Get user preferred categories
  static async getPreferredCategories(userId) {
    const query = `
      SELECT c.id, c.name
      FROM categories c
      JOIN user_preferred_categories upc ON c.id = upc.category_id
      WHERE upc.user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }
  
  // Compare password
  static async comparePassword(providedPassword, storedPassword) {
    return bcrypt.compare(providedPassword, storedPassword);
  }
}

module.exports = User;