const { User, AdminLog } = require('../models');
const config = require('../config');
const ApiError = require('../utils/ApiError');

class UserService {
  /**
   * Get user by ID
   */
  static async getById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Get all users (admin)
   */
  static async getAll(options = {}) {
    const { page, limit, role, userType, isActive, search } = options;
    const result = await User.findAll({ page, limit, role, userType, isActive, search });
    
    return {
      users: result.users.map(user => this.sanitizeUser(user)),
      total: result.total,
    };
  }

  /**
   * Update user
   */
  static async update(id, userData, adminId = null) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const oldData = { ...user };
    await User.update(id, userData);

    // Log admin action if admin is updating
    if (adminId && adminId !== id) {
      await AdminLog.create({
        adminId,
        action: 'UPDATE_USER',
        entityType: 'user',
        entityId: id,
        oldValue: this.sanitizeUser(oldData),
        newValue: userData,
      });
    }

    return this.getById(id);
  }

  /**
   * Delete user
   */
  static async delete(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Don't allow deleting admin users
    if (user.role_name === 'admin') {
      throw ApiError.forbidden('Cannot delete admin users');
    }

    await User.delete(id);

    // Log admin action
    if (adminId) {
      await AdminLog.create({
        adminId,
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: id,
        oldValue: this.sanitizeUser(user),
      });
    }

    return { message: 'User deleted successfully' };
  }

  /**
   * Block user
   */
  static async block(id, reason, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role_name === 'admin') {
      throw ApiError.forbidden('Cannot block admin users');
    }

    if (user.is_blocked) {
      throw ApiError.badRequest('User is already blocked');
    }

    await User.block(id, reason);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'BLOCK_USER',
      entityType: 'user',
      entityId: id,
      newValue: { reason },
    });

    return { message: 'User blocked successfully' };
  }

  /**
   * Unblock user
   */
  static async unblock(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.is_blocked) {
      throw ApiError.badRequest('User is not blocked');
    }

    await User.unblock(id);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'UNBLOCK_USER',
      entityType: 'user',
      entityId: id,
    });

    return { message: 'User unblocked successfully' };
  }

  /**
   * Activate user
   */
  static async activate(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.is_active) {
      throw ApiError.badRequest('User is already active');
    }

    await User.update(id, { is_active: true });

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'ACTIVATE_USER',
      entityType: 'user',
      entityId: id,
    });

    return { message: 'User activated successfully' };
  }

  /**
   * Deactivate user
   */
  static async deactivate(id, adminId) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role_name === 'admin') {
      throw ApiError.forbidden('Cannot deactivate admin users');
    }

    if (!user.is_active) {
      throw ApiError.badRequest('User is already inactive');
    }

    await User.update(id, { is_active: false });

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'DEACTIVATE_USER',
      entityType: 'user',
      entityId: id,
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Get customer count
   */
  static async getCustomerCount() {
    const count = await User.countCustomers();
    return {
      count,
      limit: config.limits.maxCustomers,
      remaining: config.limits.maxCustomers - count,
    };
  }

  /**
   * Sanitize user object
   */
  static sanitizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      user_type: user.user_type,
      role: user.role_name,
      address: user.address,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      blocked_reason: user.blocked_reason,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }
}

module.exports = UserService;
