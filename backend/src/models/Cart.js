const { query, queryOne, insert, modify, withTransaction } = require('../config/database');
const { getLocalizedField } = require('../utils/helpers');

class Cart {
  /**
   * Get or create cart for user
   */
  static async getOrCreate(userId) {
    let cart = await queryOne('SELECT * FROM carts WHERE user_id = ?', [userId]);
    
    if (!cart) {
      const cartId = await insert('INSERT INTO carts (user_id) VALUES (?)', [userId]);
      cart = { id: cartId, user_id: userId };
    }
    
    return cart;
  }

  /**
   * Get cart with items
   */
  static async getWithItems(userId, lang = 'en') {
    const cart = await this.getOrCreate(userId);
    
    const items = await query(
      `SELECT ci.*, p.name_en, p.name_te, p.unit_type, p.price as current_price,
              p.stock_quantity, p.gst_percentage, p.is_active, p.image_url,
              c.name_en as category_name_en, c.name_te as category_name_te
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at DESC`,
      [cart.id]
    );

    // Calculate totals
    let subtotal = 0;
    let totalGst = 0;
    const formattedItems = items.map(item => {
      const itemSubtotal = parseFloat(item.unit_price) * item.quantity;
      const itemGst = (itemSubtotal * parseFloat(item.gst_percentage)) / 100;
      subtotal += itemSubtotal;
      totalGst += itemGst;

      return {
        id: item.id,
        product_id: item.product_id,
        product_name: getLocalizedField(item, 'name', lang),
        category_name: getLocalizedField(item, 'category_name', lang),
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        current_price: parseFloat(item.current_price),
        gst_percentage: parseFloat(item.gst_percentage),
        stock_quantity: item.stock_quantity,
        is_active: item.is_active,
        image_url: item.image_url,
        price_changed: parseFloat(item.unit_price) !== parseFloat(item.current_price),
        item_total: itemSubtotal,
        item_gst: itemGst,
        item_grand_total: itemSubtotal + itemGst,
      };
    });

    return {
      id: cart.id,
      user_id: cart.user_id,
      items: formattedItems,
      item_count: items.length,
      subtotal: parseFloat(subtotal.toFixed(2)),
      total_gst: parseFloat(totalGst.toFixed(2)),
      total: parseFloat((subtotal + totalGst).toFixed(2)),
    };
  }

  /**
   * Add item to cart
   */
  static async addItem(userId, productId, quantity, unitPrice) {
    const cart = await this.getOrCreate(userId);
    
    // Check if item already exists in cart
    const existingItem = await queryOne(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, productId]
    );

    if (existingItem) {
      // Update quantity
      return modify(
        'UPDATE cart_items SET quantity = quantity + ?, unit_price = ? WHERE id = ?',
        [quantity, unitPrice, existingItem.id]
      );
    }

    // Add new item
    return insert(
      'INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [cart.id, productId, quantity, unitPrice]
    );
  }

  /**
   * Update item quantity
   */
  static async updateItem(userId, productId, quantity) {
    const cart = await this.getOrCreate(userId);
    
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    return modify(
      'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
      [quantity, cart.id, productId]
    );
  }

  /**
   * Remove item from cart
   */
  static async removeItem(userId, productId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) return 0;

    return modify(
      'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, productId]
    );
  }

  /**
   * Clear cart
   */
  static async clear(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) return 0;

    return modify('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
  }

  /**
   * Get cart item
   */
  static async getItem(userId, productId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) return null;

    return queryOne(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, productId]
    );
  }

  /**
   * Update item prices (sync with current product prices)
   */
  static async syncPrices(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) return 0;

    return modify(
      `UPDATE cart_items ci
       JOIN products p ON ci.product_id = p.id
       SET ci.unit_price = p.price
       WHERE ci.cart_id = ?`,
      [cart.id]
    );
  }

  /**
   * Validate cart items (check stock and active status)
   */
  static async validateItems(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (!cart) return { valid: true, issues: [] };

    const items = await query(
      `SELECT ci.*, p.stock_quantity, p.is_active, p.name_en
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    const issues = [];
    for (const item of items) {
      if (!item.is_active) {
        issues.push({
          product_id: item.product_id,
          product_name: item.name_en,
          issue: 'Product is no longer available',
          type: 'unavailable',
        });
      } else if (item.stock_quantity < item.quantity) {
        issues.push({
          product_id: item.product_id,
          product_name: item.name_en,
          issue: `Only ${item.stock_quantity} in stock`,
          type: 'insufficient_stock',
          available: item.stock_quantity,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

module.exports = Cart;
