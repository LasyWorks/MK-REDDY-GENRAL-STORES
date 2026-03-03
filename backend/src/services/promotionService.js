const Promotion = require('../models/Promotion');
const { AdminLog } = require('../models');
const ApiError = require('../utils/ApiError');
class PromotionService {
  static async getActive() {
    return Promotion.findActive();
  }
  static async getUpcoming(days = 7) {
    return Promotion.findUpcoming(days);
  }
  static async getActiveProductMap() {
    return Promotion.getActiveProductMap();
  }
  static async getForProduct(productId) {
    return Promotion.findActiveForProduct(productId);
  }
  static async getById(id) {
    const promo = await Promotion.findById(id);
    if (!promo) throw ApiError.notFound('Promotion not found');
    return promo;
  }
  static async getAll(options = {}) {
    return Promotion.findAll(options);
  }
  static async create(data, adminId) {
    const starts = new Date(data.starts_at);
    const ends   = new Date(data.ends_at);
    // Validate dates early to prevent creating invalid promotions
    if (isNaN(starts.getTime()) || isNaN(ends.getTime())) {
      throw ApiError.badRequest('Invalid start or end date');
    }
    // Prevent overlapping or backwards time ranges that confuse customers
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
    // Log activation/deactivation for audit trail (promotional compliance)
    await AdminLog.create({
      adminId,
      action: newStatus ? 'ACTIVATE_PROMOTION' : 'DEACTIVATE_PROMOTION',
      entityType: 'promotion',
      entityId: id,
    });
    return { ...promo, is_active: newStatus };
  }

  static async resetDeals(id, productId = null, adminId) {
    await this.getById(id); // throws 404 if not found
    await Promotion.resetDeals(id, productId);
    await AdminLog.create({
      adminId,
      action: 'RESET_DEAL_CLAIMS',
      entityType: 'promotion',
      entityId: id,
      newValue: { product_id: productId || 'ALL' },
    });
    return { reset: true };
  }
}
module.exports = PromotionService;
