const db = require('../config/database');

class Category {
  // Get all categories
  static async getAll() {
    const query = 'SELECT id, name FROM categories ORDER BY name';
    const result = await db.query(query);
    return result.rows;
  }

  // Get category by ID
  static async getById(id) {
    const query = 'SELECT id, name FROM categories WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  // Create a new category
  static async create(name) {
    // Check if category already exists
    const existingCategory = await this.getByName(name);
    if (existingCategory) {
      return existingCategory;
    }
    
    const query = 'INSERT INTO categories (name) VALUES ($1) RETURNING id, name';
    const result = await db.query(query, [name]);
    return result.rows[0];
  }

  // Get category by name
  static async getByName(name) {
    const query = 'SELECT id, name FROM categories WHERE LOWER(name) = LOWER($1)';
    const result = await db.query(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  // Update a category
  static async update(id, name) {
    const query = 'UPDATE categories SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name';
    const result = await db.query(query, [name, id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  // Delete a category
  static async delete(id) {
    const query = 'DELETE FROM categories WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }
}

module.exports = Category;