const { query, queryOne, insert } = require('../config/database');

class AdminLog {
  /**
   * Create admin log entry
   */
  static async create(logData) {
    const { adminId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent } = logData;

    return insert(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        entityType || null,
        entityId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress || null,
        userAgent || null
      ]
    );
  }

  /**
   * Log user action
   */
  static async logAction(req, action, entityType = null, entityId = null, oldValue = null, newValue = null) {
    return this.create({
      adminId: req.user?.id,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * Get logs
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 50, adminId = null, action = null, entityType = null, startDate = null, endDate = null } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    let params = [];

    if (adminId) {
      whereConditions.push('al.admin_id = ?');
      params.push(adminId);
    }

    if (action) {
      whereConditions.push('al.action LIKE ?');
      params.push(`%${action}%`);
    }

    if (entityType) {
      whereConditions.push('al.entity_type = ?');
      params.push(entityType);
    }

    if (startDate) {
      whereConditions.push('DATE(al.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(al.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM admin_logs al WHERE ${whereClause}`,
      params
    );

    // Get logs (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    const logs = await query(
      `SELECT al.*, u.name as admin_name, u.email as admin_email
       FROM admin_logs al
       JOIN users u ON al.admin_id = u.id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      logs: logs.map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_name: log.admin_name,
        admin_email: log.admin_email,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        old_value: log.old_value ? JSON.parse(log.old_value) : null,
        new_value: log.new_value ? JSON.parse(log.new_value) : null,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      })),
      total: countResult.total,
    };
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit = 10) {
    const safeLimit = parseInt(limit) || 10;
    const logs = await query(
      `SELECT al.*, u.name as admin_name
       FROM admin_logs al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ${safeLimit}`,
      []
    );

    return logs.map(log => ({
      id: log.id,
      admin_name: log.admin_name,
      action: log.action,
      entity_type: log.entity_type,
      created_at: log.created_at,
    }));
  }
}

module.exports = AdminLog;
