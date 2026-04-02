const { User, AdminLog } = require("../models");
const { pool } = require("../config/database");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const { getRoleIdByUserType } = require("../utils/helpers");
const EmailService = require("./emailService");
const logger = require("../utils/logger");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UserService {
  static normalizeDateOnly(value) {
    if (value === undefined || value === null || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const str = String(value).trim();
    if (!str) return null;
    return str.slice(0, 10);
  }

  static async hasIsSuperAdminColumn() {
    const result = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name = 'is_super_admin'
       LIMIT 1`,
    );
    return result.rows.length > 0;
  }

  static async getById(id) {
    if (!id || !UUID_RE.test(id)) {
      throw ApiError.notFound("User not found");
    }
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return this.sanitizeUser(user);
  }
  static async getAll(options = {}) {
    const { page, limit, role, userType, isActive, search } = options;
    const result = await User.findAll({
      page,
      limit,
      role,
      userType,
      isActive,
      search,
    });
    return {
      users: result.users.map((user) => this.sanitizeUser(user)),
      total: result.total,
    };
  }
  static async update(id, userData, adminId = null) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const incomingDob = this.normalizeDateOnly(userData.date_of_birth);
    const currentDob = this.normalizeDateOnly(user.date_of_birth);

    // DOB can be set only once by the user. After initial set, only idempotent same-value updates are allowed.
    if (userData.date_of_birth !== undefined && currentDob) {
      if (!incomingDob || incomingDob !== currentDob) {
        throw ApiError.badRequest("Date of birth can only be updated once");
      }
      userData.date_of_birth = currentDob;
    }

    const oldData = { ...user };
    await User.update(id, userData);
    if (adminId && adminId !== id) {
      await AdminLog.create({
        adminId,
        action: "UPDATE_USER",
        entityType: "user",
        entityId: id,
        oldValue: this.sanitizeUser(oldData),
        newValue: userData,
      });
    }

    const oldEmail = typeof user.email === "string" ? user.email.trim() : "";
    const newEmail = typeof userData.email === "string" ? userData.email.trim() : "";
    const emailChanged = newEmail && oldEmail.toLowerCase() !== newEmail.toLowerCase();

    if (emailChanged) {
      const displayName = userData.name || user.name || "Customer";
      EmailService.sendEmailChangeConfirmation(newEmail, displayName)
        .catch((err) => logger.error("Email change confirmation failed:", err));

      if (oldEmail) {
        EmailService.sendEmailChangeSecurityAlert(oldEmail, displayName, newEmail)
          .catch((err) => logger.error("Email change security alert failed:", err));
      }
    }

    return this.getById(id);
  }
  static async delete(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (user.role_name === "admin") {
      throw ApiError.forbidden("Cannot delete admin users");
    }

    // Soft delete — mark user as deleted and revoke all sessions
    await User.softDelete(id);

    // Revoke all refresh tokens so the user is logged out immediately
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = $1`,
        [id],
      );
    } finally {
      client.release();
    }

    if (adminId) {
      await AdminLog.create({
        adminId,
        action: "DELETE_USER",
        entityType: "user",
        entityId: id,
        oldValue: this.sanitizeUser(user),
      });
    }
    return { message: "User deleted successfully" };
  }

  static async restore(id, adminId) {
    // Find in deleted users (bypass the deleted_at IS NULL filter)
    const client = await pool.connect();
    let user;
    try {
      const result = await client.query(
        `SELECT u.*, r.name AS role_name
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1 AND u.deleted_at IS NOT NULL`,
        [id],
      );
      user = result.rows[0];
    } finally {
      client.release();
    }

    if (!user) {
      throw ApiError.notFound("Deleted user not found");
    }

    await User.restore(id);

    if (adminId) {
      await AdminLog.create({
        adminId,
        action: "RESTORE_USER",
        entityType: "user",
        entityId: id,
        newValue: { restored: true },
      });
    }
    return { message: "User restored successfully" };
  }

  static async getDeleted(options = {}) {
    const result = await User.findDeleted(options);
    return {
      users: result.users.map((u) => this.sanitizeUser(u)),
      total: result.total,
    };
  }
  static async block(id, reason, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (user.role_name === "admin") {
      throw ApiError.forbidden("Cannot block admin users");
    }
    if (user.is_blocked) {
      throw ApiError.badRequest("User is already blocked");
    }
    await User.block(id, reason);
    await AdminLog.create({
      adminId,
      action: "BLOCK_USER",
      entityType: "user",
      entityId: id,
      newValue: { reason },
    });
    return { message: "User blocked successfully" };
  }
  static async unblock(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (!user.is_blocked) {
      throw ApiError.badRequest("User is not blocked");
    }
    await User.unblock(id);
    await AdminLog.create({
      adminId,
      action: "UNBLOCK_USER",
      entityType: "user",
      entityId: id,
    });
    return { message: "User unblocked successfully" };
  }
  static async activate(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (user.is_active) {
      throw ApiError.badRequest("User is already active");
    }
    await User.update(id, { is_active: true });
    await AdminLog.create({
      adminId,
      action: "ACTIVATE_USER",
      entityType: "user",
      entityId: id,
    });
    return { message: "User activated successfully" };
  }
  static async deactivate(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    if (user.role_name === "admin") {
      throw ApiError.forbidden("Cannot deactivate admin users");
    }
    if (!user.is_active) {
      throw ApiError.badRequest("User is already inactive");
    }
    await User.update(id, { is_active: false });
    await AdminLog.create({
      adminId,
      action: "DEACTIVATE_USER",
      entityType: "user",
      entityId: id,
    });
    return { message: "User deactivated successfully" };
  }
  static async getCustomerCount() {
    const count = await User.countCustomers();
    return {
      count,
      limit: config.limits.maxCustomers,
      remaining: config.limits.maxCustomers - count,
    };
  }
  static async getStatistics() {
    const result = await User.findAll({ limit: 10000 });
    const users = result.users;
    const roles = {};
    const types = {};
    let active = 0,
      blocked = 0;
    users.forEach((u) => {
      const role = u.role_name || "unknown";
      roles[role] = (roles[role] || 0) + 1;
      const type = u.user_type || "unknown";
      types[type] = (types[type] || 0) + 1;
      if (u.is_active) active++;
      if (u.is_blocked) blocked++;
    });
    return {
      total: result.total,
      active,
      blocked,
      inactive: result.total - active,
      by_role: roles,
      by_type: types,
    };
  }
  static async create({
    name,
    phone,
    email,
    user_type = "retail",
    address,
    role_id,
    password,
  }) {
    const bcrypt = require("bcryptjs");
    const securityConfig = require("../config/security");
    const { getRoleIdByUserType } = require("../utils/helpers");
    const existing = await User.findByPhone(phone);
    if (existing) {
      throw ApiError.conflict("Phone number already registered");
    }
    const resolvedRoleId = role_id || (await getRoleIdByUserType(user_type));
    // Using bcrypt factor 12 (OWASP recommendation) for better security against brute force
    const password_hash = password
      ? await bcrypt.hash(password, securityConfig.password.bcryptRounds)
      : null;
    const newId = await User.create({
      name,
      phone,
      email,
      user_type,
      address,
      role_id: resolvedRoleId,
      password_hash,
    });
    const fullUser = await User.findById(newId);
    return this.sanitizeUser(fullUser);
  }
  static async updateCustomerType(id, customerType, adminId) {
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User not found");
    const validTypes = ["retail", "wholesale"];
    if (!validTypes.includes(customerType)) {
      throw ApiError.badRequest(
        `customer_type must be one of: ${validTypes.join(", ")}`,
      );
    }
    const newRoleId = await getRoleIdByUserType(customerType);
    await User.updateUserType(id, customerType, newRoleId);
    await AdminLog.create({
      adminId,
      action: "UPDATE_CUSTOMER_TYPE",
      entityType: "user",
      entityId: id,
      newValue: { user_type: customerType },
    });
    const updated = await User.findById(id);
    return this.sanitizeUser(updated);
  }
  static sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      display_name: user.display_name,
      date_of_birth: user.date_of_birth,
      phone: user.phone,
      email: user.email,
      user_type: user.user_type,
      role: user.role_name,
      address: user.address,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      is_super_admin: user.is_super_admin === true || user.is_super_admin === 1,
      blocked_reason: user.blocked_reason,
      last_login_at: user.last_login_at,
      deleted_at: user.deleted_at || null,
      created_at: user.created_at,
    };
  }

  static async listAdmins() {
    const hasSuperAdminColumn = await this.hasIsSuperAdminColumn();
    const superAdminSelect = hasSuperAdminColumn
      ? "u.is_super_admin"
      : "FALSE AS is_super_admin";
    const rows = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.user_type, u.is_active,
              ${superAdminSelect}, u.last_login_at, u.created_at, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.user_type = 'admin' AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC`,
    );
    return rows.rows.map((u) => this.sanitizeUser(u));
  }

  static async createAdmin({ name, phone, email, password }, requesterId) {
    const bcrypt = require("bcryptjs");
    const securityConfig = require("../config/security");

    if (!password) throw ApiError.badRequest("Password is required for admin accounts");
    if (!phone) throw ApiError.badRequest("Phone is required");

    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) throw ApiError.conflict("Phone number already registered");

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) throw ApiError.conflict("Email already registered");
    }

    const adminRoleId = await getRoleIdByUserType("admin");
    const passwordHash = await bcrypt.hash(password, securityConfig.password.bcryptRounds);

    const newId = await User.create({
      name,
      phone,
      email: email || null,
      user_type: "admin",
      role_id: adminRoleId,
      password_hash: passwordHash,
    });

    await AdminLog.create({
      adminId: requesterId,
      action: "CREATE_ADMIN",
      entityType: "user",
      entityId: newId,
      newValue: { name, phone, email, user_type: "admin" },
    });

    const fullUser = await User.findById(newId);
    return this.sanitizeUser(fullUser);
  }

  static async deleteAdmin(id, requesterId) {
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("Admin not found");
    if (user.user_type !== "admin") throw ApiError.badRequest("User is not an admin");
    if (user.is_super_admin) throw ApiError.forbidden("Super admin accounts cannot be deleted");
    if (id === requesterId) throw ApiError.forbidden("Cannot delete your own admin account");

    await User.softDelete(id);

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = $1`,
        [id],
      );
    } finally {
      client.release();
    }

    await AdminLog.create({
      adminId: requesterId,
      action: "DELETE_ADMIN",
      entityType: "user",
      entityId: id,
      oldValue: { name: user.name, email: user.email },
    });

    return { message: "Admin deleted successfully" };
  }
}
module.exports = UserService;
