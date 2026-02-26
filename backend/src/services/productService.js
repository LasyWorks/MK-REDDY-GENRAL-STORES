const { Product, Category, AdminLog } = require('../models');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { generateSku } = require('../utils/helpers');
const { revalidatePages } = require('../utils/revalidate');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
class ProductService {
  static async getById(id, lang = 'en') {
    const product = await Product.findById(id, lang);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }
  static async getAll(options = {}) {
    return Product.findAll(options);
  }
  static async getByCategory(categoryId, options = {}) {
    return Product.findAll({
      ...options,
      categoryId: categoryId,
      isActive: true,
    });
  }
  static async create(productData, adminId) {
    const productCount = await Product.count();
    if (productCount >= config.limits.maxProducts) {
      throw ApiError.forbidden(`Maximum product limit (${config.limits.maxProducts}) reached`);
    }
    const category = await Category.findById(productData.category_id);
    if (!category) {
      throw ApiError.badRequest('Invalid category');
    }
    if (!productData.sku) {
      productData.sku = generateSku(productData);
    }
    const existingSku = await Product.findBySku(productData.sku);
    if (existingSku) {
      throw ApiError.conflict('SKU already exists');
    }
    const productId = await Product.create(productData);
    await AdminLog.create({
      adminId,
      action: 'CREATE_PRODUCT',
      entityType: 'product',
      entityId: productId,
      newValue: productData,
    });
    await revalidatePages({
      tags: ['products', `category-${productData.category_id}`],
      paths: [`/categories/${productData.category_id}`],
    });
    return this.getById(productId);
  }
  static async update(id, productData, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    if (productData.category_id) {
      const category = await Category.findById(productData.category_id);
      if (!category) {
        throw ApiError.badRequest('Invalid category');
      }
    }
    if (productData.sku && productData.sku !== product.sku) {
      const existingSku = await Product.findBySku(productData.sku);
      if (existingSku) {
        throw ApiError.conflict('SKU already exists');
      }
    }
    const oldData = { ...product };
    await Product.update(id, productData);
    await AdminLog.create({
      adminId,
      action: 'UPDATE_PRODUCT',
      entityType: 'product',
      entityId: id,
      oldValue: oldData,
      newValue: productData,
    });
    const categoryId = productData.category_id || oldData.category_id;
    await revalidatePages({
      tags: ['products', `product-${id}`, `category-${categoryId}`],
      paths: [`/categories/${categoryId}`],
    });
    return this.getById(id);
  }
  static async delete(id, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    await Product.update(id, { is_active: false });
    await AdminLog.create({
      adminId,
      action: 'DEACTIVATE_PRODUCT',
      entityType: 'product',
      entityId: id,
      oldValue: { is_active: product.is_active },
      newValue: { is_active: false },
    });
    await revalidatePages({
      tags: ['products', `product-${id}`, `category-${product.category_id}`],
      paths: [`/categories/${product.category_id}`],
    });
    return { message: 'Product deactivated successfully' };
  }
  static async updateStock(id, quantity, adminId, operation = 'add') {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    let newStock;
    if (operation === 'set') {
      newStock = parseInt(quantity);
    } else {
      newStock = product.stock_quantity + quantity;
    }
    if (newStock < 0) {
      throw ApiError.badRequest('Insufficient stock');
    }
    await Product.update(id, { stock_quantity: newStock });
    await AdminLog.create({
      adminId,
      action: 'UPDATE_STOCK',
      entityType: 'product',
      entityId: id,
      oldValue: { stock_quantity: product.stock_quantity },
      newValue: { stock_quantity: newStock, change: quantity },
    });
    return {
      product_id: id,
      previous_stock: product.stock_quantity,
      new_stock: newStock,
    };
  }
  static async bulkUpload(filePath, adminId) {
    const currentCount = await Product.count();
    const remainingSlots = config.limits.maxProducts - currentCount;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    if (data.length === 0) {
      throw ApiError.badRequest('Excel file is empty');
    }
    if (data.length > remainingSlots) {
      throw ApiError.badRequest(
        `Cannot upload ${data.length} products. Only ${remainingSlots} slots available.`
      );
    }
    const validProducts = [];
    const errors = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; 
      try {
        if (!row.name_en || !row.category_id || !row.unit_type || !row.price) {
          throw new Error('Missing required fields (name_en, category_id, unit_type, price)');
        }
        const category = await Category.findById(row.category_id);
        if (!category) {
          throw new Error(`Category with ID ${row.category_id} not found`);
        }
        const validUnitTypes = ['kg', 'piece', 'case', 'litre', 'gram', 'pack'];
        if (!validUnitTypes.includes(row.unit_type)) {
          throw new Error(`Invalid unit type: ${row.unit_type}`);
        }
        if (isNaN(row.price) || row.price <= 0) {
          throw new Error('Price must be a positive number');
        }
        const sku = row.sku || generateSku(row, rowIndex);
        const existingSku = await Product.findBySku(sku);
        if (existingSku) {
          throw new Error(`SKU ${sku} already exists`);
        }
        validProducts.push({
          _rowIndex: rowIndex,
          category_id: row.category_id,
          sku,
          name_en: row.name_en.trim(),
          name_te: row.name_te ? row.name_te.trim() : null,
          unit_type: row.unit_type,
          price: parseFloat(row.price),
          gst_percentage: row.gst_percentage ? parseFloat(row.gst_percentage) : 18,
          stock_quantity: row.stock_quantity ? parseInt(row.stock_quantity) : 0,
        });
      } catch (error) {
        errors.push({
          row: rowIndex,
          sku: row.sku,
          name: row.name_en,
          error: error.message,
        });
      }
    }
    if (validProducts.length === 0) {
      fs.unlinkSync(filePath);
      throw ApiError.badRequest('All rows failed validation', errors);
    }
    const result = await Product.bulkInsert(validProducts);
    fs.unlinkSync(filePath);
    await AdminLog.create({
      adminId,
      action: 'BULK_UPLOAD_PRODUCTS',
      entityType: 'product',
      newValue: {
        total: data.length,
        successful: result.success,
        failed: result.failed + errors.length,
      },
    });
    return {
      message: 'Bulk upload completed',
      total: data.length,
      successful: result.success,
      failed: result.failed + errors.length,
      validationErrors: errors,
      insertErrors: result.errors,
    };
  }
  static async getCount() {
    const count = await Product.count();
    return {
      count,
      limit: config.limits.maxProducts,
      remaining: config.limits.maxProducts - count,
    };
  }
  static async search(query, options = {}) {
    return Product.findAll({
      ...options,
      search: query,
      isActive: true,
    });
  }
  static async getLowStock(threshold = 15) {
    const result = await Product.findAll({
      stockThreshold: threshold,
      isActive: null,
      limit: 500,
      sortBy: 'stock_quantity',
      sortOrder: 'ASC',
    });
    return {
      products: result.products,
      total: result.total,
      threshold,
    };
  }
  static async toggleActive(id, adminId) {
    const product = await this.getById(id);
    if (!product) throw ApiError.notFound('Product not found');
    const newStatus = !product.is_active;
    await Product.update(id, { is_active: newStatus });
    await AdminLog.create({
      adminId,
      action: newStatus ? 'ACTIVATE_PRODUCT' : 'DEACTIVATE_PRODUCT',
      entityType: 'product',
      entityId: id,
    });
    await revalidatePages({
      tags: ['products', `product-${id}`, `category-${product.category_id}`],
      paths: [`/categories/${product.category_id}`],
    });
    return { ...product, is_active: newStatus };
  }
}
module.exports = ProductService;