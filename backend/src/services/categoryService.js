const { Category, AdminLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { revalidatePages } = require('../utils/revalidate');
class CategoryService {
  static async getById(id, lang = 'en') {
    const category = await Category.findById(id, lang);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return category;
  }
  static async getAll(options = {}) {
    return Category.findAll(options);
  }
  static async create(categoryData, adminId) {
    const categoryId = await Category.create(categoryData);
    await AdminLog.create({
      adminId,
      action: 'CREATE_CATEGORY',
      entityType: 'category',
      entityId: categoryId,
      newValue: categoryData,
    });
    await revalidatePages({
      tags: ['categories'],
      paths: ['/categories'],
    });
    return this.getById(categoryId);
  }
  static async update(id, categoryData, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    const oldData = { ...category };
    await Category.update(id, categoryData);
    await AdminLog.create({
      adminId,
      action: 'UPDATE_CATEGORY',
      entityType: 'category',
      entityId: id,
      oldValue: oldData,
      newValue: categoryData,
    });
    await revalidatePages({
      tags: ['categories', `category-${id}`],
      paths: ['/categories', `/categories/${id}`],
    });
    return this.getById(id);
  }
  static async delete(id, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    const hasProducts = await Category.hasProducts(id);
    if (hasProducts) {
      throw ApiError.conflict('Cannot delete category with products. Remove or reassign products first.');
    }
    await Category.delete(id);
    await AdminLog.create({
      adminId,
      action: 'DELETE_CATEGORY',
      entityType: 'category',
      entityId: id,
      oldValue: category,
    });
    await revalidatePages({
      tags: ['categories', `category-${id}`],
      paths: ['/categories'],
    });
    return { message: 'Category deleted successfully' };
  }
  static async toggleActive(id, adminId) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    const newStatus = !category.is_active;
    await Category.update(id, { is_active: newStatus });
    await AdminLog.create({
      adminId,
      action: newStatus ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY',
      entityType: 'category',
      entityId: id,
    });
    await revalidatePages({
      tags: ['categories', `category-${id}`],
      paths: ['/categories', `/categories/${id}`],
    });
    return {
      message: `Category ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus,
    };
  }
}
module.exports = CategoryService;