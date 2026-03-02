const { query, queryOne, insert, modify } = require('../config/database');
class User {
  static async findById(id) {
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );
  }
  static async findByPhone(phone) {
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.phone = $1`,
      [phone]
    );
  }
  static async findByEmail(email) {
    // Check primary email first
    const user = await queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );
    if (user) return user;
    // Then check linked (secondary) emails created by account merges
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN linked_identities li ON li.primary_user_id = u.id
       WHERE li.linked_email = $1`,
      [email]
    );
  }
  static async create(userData) {
    const { name, phone, email, user_type, role_id, address, password_hash, google_id, profile_picture, email_verified } = userData;
    return insert(
      `INSERT INTO users (name, phone, email, user_type, role_id, address, password_hash, google_id, profile_picture, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [name, phone, email || null, user_type, role_id, address || null, password_hash || null, google_id || null, profile_picture || null, email_verified || false]
    );
  }
  static async update(id, userData) {
    const allowed = ['name', 'email', 'phone', 'address', 'profile_picture', 'is_active', 'is_blocked', 'blocked_reason', 'last_login_at'];
    const fields  = [];
    const values  = [];
    let   idx     = 1;
    for (const [key, value] of Object.entries(userData)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) return 0;
    values.push(id);
    return modify(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  }

  static async updateProfilePicture(id, profilePicture) {
    return modify('UPDATE users SET profile_picture = $1 WHERE id = $2', [profilePicture, id]);
  }
  static async delete(id) {
    return modify('DELETE FROM users WHERE id = $1', [id]);
  }
  static async findAll(options = {}) {
    const { page = 1, limit = 10, role = null, userType = null, isActive = null, search = null } = options;
    const offset = (page - 1) * limit;
    const conds  = ['1=1'];
    const params = [];
    let   idx    = 1;
    if (role)           { conds.push(`r.name = $${idx++}`);      params.push(role);     }
    if (userType)       { conds.push(`u.user_type = $${idx++}`); params.push(userType); }
    if (isActive !== null) { conds.push(`u.is_active = $${idx++}`); params.push(isActive); }
    if (search) {
      conds.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }
    const where = conds.join(' AND ');
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id WHERE ${where}`,
      params
    );
    const listParams = [...params, limit, offset];
    const users = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.user_type, u.address,
              u.is_active, u.is_blocked, u.last_login_at, u.created_at, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams
    );
    return { users, total: parseInt(countRow.total, 10) };
  }
  static async countCustomers() {
    const result = await queryOne(
      `SELECT COUNT(*) AS count FROM users WHERE user_type IN ('retail', 'wholesale')`
    );
    return parseInt(result.count, 10);
  }
  static async block(id, reason) {
    return modify(
      'UPDATE users SET is_blocked = TRUE, blocked_reason = $1 WHERE id = $2',
      [reason, id]
    );
  }
  static async unblock(id) {
    return modify(
      'UPDATE users SET is_blocked = FALSE, blocked_reason = NULL WHERE id = $1',
      [id]
    );
  }
  static async updateLastLogin(id) {
    return modify('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }
  
  static async updateGoogleId(id, googleId) {
    return modify('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, id]);
  }
}
module.exports = User;
