const { query, queryOne, insert, modify } = require("../config/database");
class User {
  // Returns all email addresses belonging to active admin users
  static async findAdminEmails() {
    const rows = await query(
      `SELECT email FROM users
       WHERE user_type = 'admin'
         AND email IS NOT NULL
         AND email <> ''
         AND is_active = TRUE
         AND (is_blocked = FALSE OR is_blocked IS NULL)
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
    );
    return rows.map((r) => r.email);
  }

  // Returns active customer recipients for announcements (non-admin users).
  static async findCustomerEmailRecipients() {
    return query(
      `SELECT id, name, email
       FROM users
       WHERE user_type IN ('retail', 'wholesale')
         AND email IS NOT NULL
         AND email <> ''
         AND is_active = TRUE
         AND (is_blocked = FALSE OR is_blocked IS NULL)
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
    );
  }

  static async findById(id) {
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );
  }
  static async findByPhone(phone) {
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.phone = $1 AND u.deleted_at IS NULL`,
      [phone],
    );
  }
  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.google_id = $1 AND u.deleted_at IS NULL`,
      [googleId],
    );
  }
  static async findByEmail(email) {
    // Check primary email first
    const user = await queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email],
    );
    if (user) return user;
    // Then check linked (secondary) emails created by account merges
    return queryOne(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN linked_identities li ON li.primary_user_id = u.id
       WHERE li.linked_email = $1 AND u.deleted_at IS NULL`,
      [email],
    );
  }
  static async softDelete(id) {
    return modify(
      `UPDATE users
       SET
         deleted_phone = phone,
         deleted_email = email,
         phone = ('D' || substring(replace(id::text, '-', '') from 1 for 14)),
         email = CASE
           WHEN email IS NULL THEN NULL
           ELSE ('deleted+' || substring(replace(id::text, '-', '') from 1 for 20) || '@del.local')
         END,
         google_id = NULL,
         deleted_at = NOW(),
         is_active = FALSE
       WHERE id = $1`,
      [id],
    );
  }
  static async restore(id) {
    return modify(
      `UPDATE users
       SET
         deleted_at = NULL,
         is_active = TRUE,
         phone = COALESCE(deleted_phone, phone),
         email = COALESCE(deleted_email, email),
         deleted_phone = NULL,
         deleted_email = NULL
       WHERE id = $1`,
      [id],
    );
  }
  static async findDeleted(options = {}) {
    const { page = 1, limit = 20, search = null } = options;
    const offset = (page - 1) * limit;
    const conds = ["u.deleted_at IS NOT NULL"];
    const params = [];
    let idx = 1;
    if (search) {
      conds.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }
    const where = conds.join(" AND ");
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id WHERE ${where}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const users = await query(
      `SELECT u.id, u.name, u.display_name, u.phone, u.email, u.user_type, u.address,
              u.date_of_birth, u.is_active, u.is_blocked, u.deleted_at, u.created_at, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE ${where}
       ORDER BY u.deleted_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams,
    );
    return { users, total: parseInt(countRow.total, 10) };
  }
  static async create(userData) {
    const {
      name,
      display_name,
      phone,
      email,
      user_type,
      role_id,
      address,
      date_of_birth,
      password_hash,
      google_id,
      profile_picture,
      email_verified,
    } = userData;
    return insert(
      `INSERT INTO users (name, display_name, phone, email, user_type, role_id, address, date_of_birth, password_hash, google_id, profile_picture, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        name,
        display_name || null,
        phone,
        email || null,
        user_type,
        role_id,
        address || null,
        date_of_birth || null,
        password_hash || null,
        google_id || null,
        profile_picture || null,
        email_verified || false,
      ],
    );
  }
  static async update(id, userData) {
    const allowed = [
      "name",
      "display_name",
      "email",
      "phone",
      "address",
      "date_of_birth",
      "profile_picture",
      "is_active",
      "is_blocked",
      "blocked_reason",
      "last_login_at",
      "email_verified",
    ];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(userData)) {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) return 0;
    values.push(id);
    return modify(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}`,
      values,
    );
  }

  static async updateUserType(id, userType, roleId) {
    return modify(
      "UPDATE users SET user_type = $1, role_id = $2 WHERE id = $3",
      [userType, roleId, id],
    );
  }
  static async updateProfilePicture(id, profilePicture) {
    return modify("UPDATE users SET profile_picture = $1 WHERE id = $2", [
      profilePicture,
      id,
    ]);
  }
  static async delete(id) {
    return modify("DELETE FROM users WHERE id = $1", [id]);
  }
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      role = null,
      userType = null,
      isActive = null,
      search = null,
    } = options;
    const offset = (page - 1) * limit;
    const conds = ["u.deleted_at IS NULL"];
    const params = [];
    let idx = 1;
    if (role) {
      conds.push(`r.name = $${idx++}`);
      params.push(role);
    }
    if (userType) {
      conds.push(`u.user_type = $${idx++}`);
      params.push(userType);
    }
    if (isActive !== null) {
      conds.push(`u.is_active = $${idx++}`);
      params.push(isActive);
    }
    if (search) {
      conds.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }
    const where = conds.join(" AND ");
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id = r.id WHERE ${where}`,
      params,
    );
    const listParams = [...params, limit, offset];
    const users = await query(
      `SELECT u.id, u.name, u.display_name, u.phone, u.email, u.user_type, u.address,
              u.date_of_birth, u.is_active, u.is_blocked, u.last_login_at, u.created_at, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      listParams,
    );
    return { users, total: parseInt(countRow.total, 10) };
  }
  static async countCustomers() {
    const result = await queryOne(
      `SELECT COUNT(*) AS count FROM users WHERE user_type IN ('retail', 'wholesale') AND deleted_at IS NULL`,
    );
    return parseInt(result.count, 10);
  }
  static async block(id, reason) {
    return modify(
      "UPDATE users SET is_blocked = TRUE, blocked_reason = $1 WHERE id = $2",
      [reason, id],
    );
  }
  static async unblock(id) {
    return modify(
      "UPDATE users SET is_blocked = FALSE, blocked_reason = NULL WHERE id = $1",
      [id],
    );
  }
  static async updateLastLogin(id) {
    return modify("UPDATE users SET last_login_at = NOW() WHERE id = $1", [id]);
  }

  static async updateGoogleId(id, googleId) {
    return modify("UPDATE users SET google_id = $1 WHERE id = $2", [
      googleId,
      id,
    ]);
  }
}
module.exports = User;
