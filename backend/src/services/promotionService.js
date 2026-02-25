const Promotion = require('../models/Promotion');
const { AdminLog } = require('../models');
const ApiError = require('../utils/ApiError');

class PromotionService {
  /* ── Public ─────────────────────────────────────────────────────────────── */

  /** Active promotions (banners + badge data for storefront) */
  static async getActive() {
    return Promotion.findActive();
  }

  /** Upcoming promotions (next 7 days) */
  static async getUpcoming(days = 7) {
    return Promotion.findUpcoming(days);
  }

  /** Map of product_id → active promo for badge decoration */
  static async getActiveProductMap() {
    return Promotion.getActiveProductMap();
  }

  /** Active promo for a single product */
  static async getForProduct(productId) {
    return Promotion.findActiveForProduct(productId);
  }

  /* ── Admin ──────────────────────────────────────────────────────────────── */

  static async getById(id) {
    const promo = await Promotion.findById(id);
    if (!promo) throw ApiError.notFound('Promotion not found');
    return promo;
  }

  static async getAll(options = {}) {
    return Promotion.findAll(options);
  }

  static async create(data, adminId) {
    // Validate dates
    const starts = new Date(data.starts_at);
    const ends   = new Date(data.ends_at);
    if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
      throw ApiError.badRequest('Invalid start or end date');
    }
    if (ends <= starts) {
      throw ApiError.badRequest('End date must be after start date');
    }

    const promoId = await Promotion.create(data);

    await AdminLog.create({
      adminId,
      action: 'CREATE_PROMOTION',
      entityType: 'promotion',
      entityId: promoId,
      newValue: data,
    });

    return this.getById(promoId);
  }

  static async update(id, data, adminId) {
    const old = await this.getById(id);

    if (data.starts_at && data.ends_at) {
      const starts = new Date(data.starts_at);
      const ends   = new Date(data.ends_at);
      if (ends <= starts) {
        throw ApiError.badRequest('End date must be after start date');
      }
    }

    await Promotion.update(id, data);

    await AdminLog.create({
      adminId,
      action: 'UPDATE_PROMOTION',
      entityType: 'promotion',
      entityId: id,
      oldValue: old,
      newValue: data,
    });

    return this.getById(id);
  }

  static async delete(id, adminId) {
    const promo = await this.getById(id);
    await Promotion.delete(id);

    await AdminLog.create({
      adminId,
      action: 'DELETE_PROMOTION',
      entityType: 'promotion',
      entityId: id,
      oldValue: promo,
    });

    return { message: 'Promotion deleted successfully' };
  }

  static async toggleActive(id, adminId) {
    const promo = await this.getById(id);
    const newStatus = !promo.is_active;
    await Promotion.update(id, { is_active: newStatus });

    await AdminLog.create({
      adminId,
      action: newStatus ? 'ACTIVATE_PROMOTION' : 'DEACTIVATE_PROMOTION',
      entityType: 'promotion',
      entityId: id,
    });

    return { ...promo, is_active: newStatus };
  }
}

module.exports = PromotionService;
