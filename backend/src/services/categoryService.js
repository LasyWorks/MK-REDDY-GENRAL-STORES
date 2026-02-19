const { Category, AdminLog } = require('../models');
const ApiError = require('../utils/ApiError');

class CategoryService {
  /**
   * Get category by ID
   */
  static async getById(id, lang = 'en') {
    const category = await Category.findById(id, lang);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return category;
  }

  /**
   * Get all categories
   */
  static async getAll(options = {}) {
    return Category.findAll(options);
  }

  /**
   * Create category
   */
  static async create(categoryData, adminId) {
    const categoryId = await Category.create(categoryData);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'CREATE_CATEGORY',
      entityType: 'category',
      entityId: categoryId,
      newValue: categoryData,
    });

    return this.getById(categoryId);
  }

  /**
   * Update category
   */
  static async update(id, categoryData, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const oldData = { ...category };
    await Category.update(id, categoryData);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'UPDATE_CATEGORY',
      entityType: 'category',
      entityId: id,
      oldValue: oldData,
      newValue: categoryData,
    });

    return this.getById(id);
  }

  /**
   * Delete category
   */
  static async delete(id, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if category has products
    const hasProducts = await Category.hasProducts(id);
    if (hasProducts) {
      throw ApiError.conflict('Cannot delete category with products. Remove or reassign products first.');
    }

    await Category.delete(id);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'DELETE_CATEGORY',
      entityType: 'category',
      entityId: id,
      oldValue: category,
    });

    return { message: 'Category deleted successfully' };
  }

  /**
   * Toggle category active status
   */
  static async toggleActive(id, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    const newStatus = !category.is_active;
    await Category.update(id, { is_active: newStatus });

    // Log admin action
    await AdminLog.create({
      adminId,
      action: newStatus ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY',
      entityType: 'category',
      entityId: id,
    });

    return {
      message: `Category ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus,
    };
  }
}

module.exports = CategoryService;
