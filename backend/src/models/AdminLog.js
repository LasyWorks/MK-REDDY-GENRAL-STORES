const { query, queryOne, insert } = require('../config/database');

class AdminLog {
  static async create(logData) {
    const { adminId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent } = logData;
    return insert(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        adminId, action,
        entityType || null, entityId || null,
        oldValue ? oldValue : null,   // schema uses JSONB — pass object directly
        newValue ? newValue : null,
        ipAddress || null, userAgent || null,
      ]
    );
  }

  static async logAction(req, action, entityType = null, entityId = null, oldValue = null, newValue = null) {
    return this.create({
      adminId: req.user?.id, action, entityType, entityId, oldValue, newValue,
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
  }

  static async findAll(options = {}) {
    const { page = 1, limit = 50, adminId = null, action = null, entityType = null, startDate = null, endDate = null } = options;
    const offset = (page - 1) * limit;
    const conds = ['1=1']; const params = []; let idx = 1;

    if (adminId)    { conds.push(`al.admin_id = $${idx++}`);               params.push(adminId); }
    if (action)     { conds.push(`al.action ILIKE $${idx++}`);             params.push(`%${action}%`); }
    if (entityType) { conds.push(`al.entity_type = $${idx++}`);            params.push(entityType); }
    if (startDate)  { conds.push(`al.created_at::date >= $${idx++}`);      params.push(startDate); }
    if (endDate)    { conds.push(`al.created_at::date <= $${idx++}`);      params.push(endDate); }

    const where = conds.join(' AND ');
    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM admin_logs al WHERE ${where}`, params);

    const logs = await query(
      `SELECT al.*, u.name AS admin_name, u.email AS admin_email
       FROM admin_logs al JOIN users u ON al.admin_id = u.id
       WHERE ${where} ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return {
      logs: logs.map(log => ({
        id: log.id, admin_id: log.admin_id,
        admin_name: log.admin_name, admin_email: log.admin_email,
        action: log.action, entity_type: log.entity_type, entity_id: log.entity_id,
        old_value: log.old_value, new_value: log.new_value,
        ip_address: log.ip_address, user_agent: log.user_agent,
        created_at: log.created_at,
      })),
      total: parseInt(countRow.total, 10),
    };
  }

  static async getRecentActivity(limit = 10) {
    const rows = await query(
      `SELECT al.*, u.name AS admin_name FROM admin_logs al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT $1`,
      [parseInt(limit, 10) || 10]
    );
    return rows.map(log => ({
      id: log.id, admin_name: log.admin_name,
      action: log.action, entity_type: log.entity_type, created_at: log.created_at,
    }));
  }
}

module.exports = AdminLog;
