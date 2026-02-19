const { query, queryOne, insert, modify } = require('../config/database');

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    return queryOne(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );
  }

  /**
   * Find user by phone
   */
  static async findByPhone(phone) {
    return queryOne(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.phone = ?`,
      [phone]
    );
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return queryOne(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { name, phone, email, user_type, role_id, address } = userData;
    return insert(
      `INSERT INTO users (name, phone, email, user_type, role_id, address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email || null, user_type, role_id, address || null]
    );
  }

  /**
   * Update user
   */
  static async update(id, userData) {
    const fields = [];
    const values = [];

    const allowedFields = ['name', 'email', 'address', 'is_active', 'is_blocked', 'blocked_reason', 'last_login_at'];

    for (const [key, value] of Object.entries(userData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    return modify(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete user
   */
  static async delete(id) {
    return modify('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Get all users with pagination
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 10, role = null, userType = null, isActive = null, search = null } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    let params = [];

    if (role) {
      whereConditions.push('r.name = ?');
      params.push(role);
    }

    if (userType) {
      whereConditions.push('u.user_type = ?');
      params.push(userType);
    }

    if (isActive !== null) {
      whereConditions.push('u.is_active = ?');
      params.push(isActive);
    }

    if (search) {
      whereConditions.push('(u.name LIKE ? OR u.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE ${whereClause}`,
      params
    );

    // Get users (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    const users = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.user_type, u.address, 
              u.is_active, u.is_blocked, u.last_login_at, u.created_at,
              r.name as role_name
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      users,
      total: countResult.total,
    };
  }

  /**
   * Count customers
   */
  static async countCustomers() {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM users WHERE user_type IN ('retail', 'wholesale')`,
      []
    );
    return result.count;
  }

  /**
   * Block user
   */
  static async block(id, reason) {
    return modify(
      'UPDATE users SET is_blocked = TRUE, blocked_reason = ? WHERE id = ?',
      [reason, id]
    );
  }

  /**
   * Unblock user
   */
  static async unblock(id) {
    return modify(
      'UPDATE users SET is_blocked = FALSE, blocked_reason = NULL WHERE id = ?',
      [id]
    );
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id) {
    return modify(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [id]
    );
  }
}

module.exports = User;
