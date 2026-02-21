const { query, queryOne, insert, modify } = require('../config/database');

class Cart {
  static async getOrCreate(userId) {
    let cart = await queryOne('SELECT * FROM carts WHERE user_id = $1', [userId]);
    if (!cart) {
      const id = await insert('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      cart = { id, user_id: userId };
    }
    return cart;
  }

  static async getWithItems(userId, lang = 'en') {
    const cart = await this.getOrCreate(userId);

    const items = await query(
      `SELECT ci.*,
              COALESCE(pt_req.name, pt_en.name)  AS product_name,
              p.unit_type, p.price AS current_price,
              p.stock_quantity, p.gst_percentage, p.is_active, p.image_url,
              COALESCE(ct_req.name, ct_en.name)  AS category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_translations  pt_req ON p.id = pt_req.product_id AND pt_req.lang_code = $2
       LEFT JOIN product_translations  pt_en  ON p.id = pt_en.product_id  AND pt_en.lang_code  = 'en'
       LEFT JOIN category_translations ct_req ON c.id = ct_req.category_id AND ct_req.lang_code = $2
       LEFT JOIN category_translations ct_en  ON c.id = ct_en.category_id  AND ct_en.lang_code  = 'en'
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at DESC`,
      [cart.id, lang]
    );

    let subtotal = 0;
    let totalGst = 0;
    const formattedItems = items.map(item => {
      const itemSub  = parseFloat(item.unit_price) * item.quantity;
      const itemGst  = (itemSub * parseFloat(item.gst_percentage)) / 100;
      subtotal  += itemSub;
      totalGst  += itemGst;
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        category_name: item.category_name,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        current_price: parseFloat(item.current_price),
        gst_percentage: parseFloat(item.gst_percentage),
        stock_quantity: item.stock_quantity,
        is_active: item.is_active,
        image_url: item.image_url,
        price_changed: parseFloat(item.unit_price) !== parseFloat(item.current_price),
        item_total: itemSub,
        item_gst: itemGst,
        item_grand_total: itemSub + itemGst,
      };
    });

    return {
      id: cart.id, user_id: cart.user_id,
      items: formattedItems, item_count: items.length,
      subtotal: parseFloat(subtotal.toFixed(2)),
      total_gst: parseFloat(totalGst.toFixed(2)),
      total: parseFloat((subtotal + totalGst).toFixed(2)),
    };
  }

  static async addItem(userId, productId, quantity, unitPrice) {
    const cart = await this.getOrCreate(userId);
    const existing = await queryOne(
      'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );
    if (existing) {
      return modify(
        'UPDATE cart_items SET quantity = quantity + $1, unit_price = $2 WHERE id = $3',
        [quantity, unitPrice, existing.id]
      );
    }
    return insert(
      'INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4) RETURNING id',
      [cart.id, productId, quantity, unitPrice]
    );
  }

  static async updateItem(userId, productId, quantity) {
    if (quantity <= 0) return this.removeItem(userId, productId);
    const cart = await this.getOrCreate(userId);
    return modify(
      'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
      [quantity, cart.id, productId]
    );
  }

  static async removeItem(userId, productId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return 0;
    return modify('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, productId]);
  }

  static async clear(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return 0;
    return modify('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
  }

  static async getItem(userId, productId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return null;
    return queryOne('SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, productId]);
  }

  static async syncPrices(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return 0;
    return modify(
      `UPDATE cart_items ci SET unit_price = p.price
       FROM products p WHERE ci.product_id = p.id AND ci.cart_id = $1`,
      [cart.id]
    );
  }

  static async validateItems(userId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return { valid: true, issues: [] };

    const items = await query(
      `SELECT ci.*, p.stock_quantity, p.is_active,
              COALESCE(pt.name, 'Unknown') AS product_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
       WHERE ci.cart_id = $1`,
      [cart.id]
    );

    const issues = [];
    for (const item of items) {
      if (!item.is_active) {
        issues.push({ product_id: item.product_id, product_name: item.product_name,
          issue: 'Product is no longer available', type: 'unavailable' });
      } else if (item.stock_quantity < item.quantity) {
        issues.push({ product_id: item.product_id, product_name: item.product_name,
          issue: `Only ${item.stock_quantity} in stock`, type: 'insufficient_stock',
          available: item.stock_quantity });
      }
    }
    return { valid: issues.length === 0, issues };
  }
}

module.exports = Cart;
