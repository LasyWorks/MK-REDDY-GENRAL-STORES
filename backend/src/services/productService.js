const { Product, Category, AdminLog } = require('../models');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

class ProductService {
  /**
   * Get product by ID
   */
  static async getById(id, lang = 'en') {
    const product = await Product.findById(id, lang);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }

  /**
   * Get all products
   */
  static async getAll(options = {}) {
    return Product.findAll(options);
  }

  /**
   * Create product
   */
  static async create(productData, adminId) {
    // Check product limit
    const productCount = await Product.count();
    if (productCount >= config.limits.maxProducts) {
      throw ApiError.forbidden(`Maximum product limit (${config.limits.maxProducts}) reached`);
    }

    // Verify category exists
    const category = await Category.findById(productData.category_id);
    if (!category) {
      throw ApiError.badRequest('Invalid category');
    }

    // Check SKU uniqueness if provided
    if (productData.sku) {
      const existingSku = await Product.findBySku(productData.sku);
      if (existingSku) {
        throw ApiError.conflict('SKU already exists');
      }
    }

    const productId = await Product.create(productData);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'CREATE_PRODUCT',
      entityType: 'product',
      entityId: productId,
      newValue: productData,
    });

    return this.getById(productId);
  }

  /**
   * Update product
   */
  static async update(id, productData, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Verify category if changing
    if (productData.category_id) {
      const category = await Category.findById(productData.category_id);
      if (!category) {
        throw ApiError.badRequest('Invalid category');
      }
    }

    // Check SKU uniqueness if changing
    if (productData.sku && productData.sku !== product.sku) {
      const existingSku = await Product.findBySku(productData.sku);
      if (existingSku) {
        throw ApiError.conflict('SKU already exists');
      }
    }

    const oldData = { ...product };
    await Product.update(id, productData);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'UPDATE_PRODUCT',
      entityType: 'product',
      entityId: id,
      oldValue: oldData,
      newValue: productData,
    });

    return this.getById(id);
  }

  /**
   * Delete product
   */
  static async delete(id, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    await Product.delete(id);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'DELETE_PRODUCT',
      entityType: 'product',
      entityId: id,
      oldValue: product,
    });

    return { message: 'Product deleted successfully' };
  }

  /**
   * Update product stock
   */
  static async updateStock(id, quantity, adminId) {
    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const newStock = product.stock_quantity + quantity;
    if (newStock < 0) {
      throw ApiError.badRequest('Insufficient stock');
    }

    await Product.update(id, { stock_quantity: newStock });

    // Log admin action
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

  /**
   * Bulk upload products from Excel
   */
  static async bulkUpload(filePath, adminId) {
    // Check product limit
    const currentCount = await Product.count();
    const remainingSlots = config.limits.maxProducts - currentCount;

    // Read Excel file
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

    // Validate and transform data
    const validProducts = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel row (1-indexed + header)

      try {
        // Required fields validation
        if (!row.name_en || !row.category_id || !row.unit_type || !row.price) {
          throw new Error('Missing required fields (name_en, category_id, unit_type, price)');
        }

        // Validate category exists
        const category = await Category.findById(row.category_id);
        if (!category) {
          throw new Error(`Category with ID ${row.category_id} not found`);
        }

        // Validate unit type
        const validUnitTypes = ['kg', 'piece', 'case', 'litre', 'gram', 'pack'];
        if (!validUnitTypes.includes(row.unit_type)) {
          throw new Error(`Invalid unit type: ${row.unit_type}`);
        }

        // Validate price
        if (isNaN(row.price) || row.price <= 0) {
          throw new Error('Price must be a positive number');
        }

        // SKU uniqueness check
        if (row.sku) {
          const existingSku = await Product.findBySku(row.sku);
          if (existingSku) {
            throw new Error(`SKU ${row.sku} already exists`);
          }
        }

        validProducts.push({
          _rowIndex: rowIndex,
          category_id: parseInt(row.category_id),
          sku: row.sku || null,
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

    // If all rows failed validation
    if (validProducts.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      throw ApiError.badRequest('All rows failed validation', errors);
    }

    // Bulk insert valid products
    const result = await Product.bulkInsert(validProducts);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Log admin action
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

  /**
   * Get product count
   */
  static async getCount() {
    const count = await Product.count();
    return {
      count,
      limit: config.limits.maxProducts,
      remaining: config.limits.maxProducts - count,
    };
  }
}

module.exports = ProductService;
