const {
  query,
  queryOne,
  insert,
  modify,
  withTransaction,
} = require("../config/database");
const { parseVariantToKg } = require('../utils/helpers');

/**
 * Format a decimal kg quantity into a human-readable string for loose items.
 * formatLooseQty(50)    => "50 kg"
 * formatLooseQty(0.5)   => "500 g"
 * formatLooseQty(1.25)  => "1.25 kg"
 */
function formatLooseQty(kg) {
  if (kg < 1) {
    return `${Math.round(kg * 1000)} g`;
  }
  const rounded = parseFloat(kg.toFixed(3));
  return `${rounded} kg`;
}

class Cart {
  static async getOrCreate(userId) {
    let cart = await queryOne("SELECT * FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) {
      const id = await insert(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
        [userId],
      );
      cart = { id, user_id: userId };
    }
    return cart;
  }
  static async getWithItems(
    userId,
    lang = "en",
    gstConfig = null,
    userType = "retail",
  ) {
    const cart = await this.getOrCreate(userId);
    const items = await query(
      `SELECT ci.*,
              COALESCE(pt_req.name, pt_en.name)  AS product_name,
              pt_en.name AS product_name_en,
              p.unit_type, p.variant, p.unit_pack_size, p.parent_product_id, p.price AS current_price,
              p.wholesale_price AS current_wholesale_price,
              p.stock_quantity, p.gst_percentage, p.is_active, p.image_url,
              COALESCE(ct_req.name, ct_en.name)  AS category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_translations  pt_req ON p.id = pt_req.product_id AND pt_req.lang_code = $2
       LEFT JOIN product_translations  pt_en  ON p.id = pt_en.product_id  AND pt_en.lang_code  = 'en'
       LEFT JOIN category_translations ct_req ON c.id = ct_req.category_id AND ct_req.lang_code = $2
       LEFT JOIN category_translations ct_en  ON c.id = ct_en.category_id  AND ct_en.lang_code  = 'en'
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at DESC`,
      [cart.id, lang],
    );

    // Resolve GST config flags
    // Retail prices are MRP-inclusive (GST already baked in — back-calculate for invoice)
    // Wholesale prices are GST-exclusive (add GST on top for billing)
    const gstEnabled =
      !gstConfig ||
      (gstConfig.gst_enabled !== "0" && gstConfig.gst_enabled !== "false");
    const isWholesale = userType === "wholesale";
    const gstInclusive = isWholesale
      ? false  // wholesale: price is pre-tax, GST added on top
      : gstConfig
        ? (gstConfig.retail_gst_inclusive === "1" || gstConfig.retail_gst_inclusive === "true")
        : true; // retail default: price is MRP-inclusive
    const retailRate = parseFloat(gstConfig?.retail_gst_rate || 0);
    const wholesaleRate = parseFloat(gstConfig?.wholesale_gst_rate || 0);

    let subtotal = 0;
    let totalGst = 0;
    const formattedItems = items.map((item) => {
      // Determine effective GST rate for this user type
      let effectiveRate;
      if (!gstEnabled) {
        effectiveRate = 0;
      } else if (userType === "wholesale" && wholesaleRate > 0) {
        effectiveRate = wholesaleRate;
      } else if ((userType === "retail" || !userType) && retailRate > 0) {
        effectiveRate = retailRate;
      } else {
        effectiveRate = parseFloat(item.gst_percentage);
      }

      const baseAmount = parseFloat(item.unit_price) * item.quantity;
      let itemSub, itemGst, itemGrandTotal;

      if (gstInclusive && effectiveRate > 0) {
        // MRP-inclusive: price already contains GST — back-calculate the tax portion
        itemGrandTotal = baseAmount;
        itemGst = parseFloat(
          (baseAmount - baseAmount / (1 + effectiveRate / 100)).toFixed(2),
        );
        itemSub = parseFloat((baseAmount - itemGst).toFixed(2));
      } else {
        // GST added on top (or GST disabled)
        itemSub = baseAmount;
        itemGst = gstEnabled
          ? parseFloat(((itemSub * effectiveRate) / 100).toFixed(2))
          : 0;
        itemGrandTotal = itemSub + itemGst;
      }

      subtotal += itemSub;
      totalGst += itemGst;

      // For wholesale users, compare against wholesale_price (or fallback);
      // for retail users, compare against the standard retail price.
      const expectedPrice = isWholesale
        ? parseFloat(item.current_wholesale_price || item.current_price)
        : parseFloat(item.current_price);

      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_name_en: item.product_name_en || item.product_name,
        category_name: item.category_name,
        unit_type: item.unit_type,
        variant: item.variant,
        parent_product_id: item.parent_product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        current_price: parseFloat(item.current_price),
        gst_percentage: effectiveRate,
        stock_quantity: item.stock_quantity,
        is_active: item.is_active,
        image_url: item.image_url,
        price_changed:
          parseFloat(item.unit_price) !== expectedPrice,
        item_total: itemSub,
        item_gst: itemGst,
        item_grand_total: itemGrandTotal,
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
  static async addItem(userId, productId, quantity, unitPrice) {
    const cart = await this.getOrCreate(userId);
    const existing = await queryOne(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart.id, productId],
    );
    if (existing) {
      return modify(
        "UPDATE cart_items SET quantity = quantity + $1, unit_price = $2 WHERE id = $3",
        [quantity, unitPrice, existing.id],
      );
    }
    return insert(
      "INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4) RETURNING id",
      [cart.id, productId, quantity, unitPrice],
    );
  }
  static async updateItem(userId, productId, quantity) {
    if (quantity <= 0) return this.removeItem(userId, productId);
    const cart = await this.getOrCreate(userId);
    return modify(
      "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3",
      [quantity, cart.id, productId],
    );
  }
  static async removeItem(userId, productId) {
    const cart = await queryOne("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) return 0;
    return modify(
      "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart.id, productId],
    );
  }
  static async clear(userId) {
    const cart = await queryOne("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) return 0;
    return modify("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
  }
  static async getItem(userId, productId) {
    const cart = await queryOne("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) return null;
    return queryOne(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cart.id, productId],
    );
  }
  static async syncPrices(userId, userType = 'retail', wholesaleDiscountPct = 0) {
    const cart = await queryOne("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) return 0;
    if (userType === 'wholesale') {
      return modify(
        `UPDATE cart_items ci
         SET unit_price = COALESCE(p.wholesale_price, p.price * (1 - $2::numeric / 100))
         FROM products p WHERE ci.product_id = p.id AND ci.cart_id = $1`,
        [cart.id, wholesaleDiscountPct],
      );
    }
    return modify(
      `UPDATE cart_items ci SET unit_price = p.price
       FROM products p WHERE ci.product_id = p.id AND ci.cart_id = $1`,
      [cart.id],
    );
  }
  static async validateItems(userId) {
    const cart = await queryOne("SELECT id FROM carts WHERE user_id = $1", [
      userId,
    ]);
    if (!cart) return { valid: true, issues: [] };
    const items = await query(
      `SELECT ci.*, p.stock_quantity, p.is_active, p.unit_type, p.variant, p.parent_product_id,
              COALESCE(pt.name, 'Unknown') AS product_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_translations pt ON p.id = pt.product_id AND pt.lang_code = 'en'
       WHERE ci.cart_id = $1`,
      [cart.id],
    );
    const issues = [];
    // Group loose items by shared stock pool root product
    const loosePoolMap = {};
    for (const item of items) {
      if (item.unit_type === 'loose') {
        const rootId = item.parent_product_id || item.product_id;
        const kgPerUnit = parseVariantToKg(item.variant);
        if (kgPerUnit !== null) {
          if (!loosePoolMap[rootId]) loosePoolMap[rootId] = { items: [], totalKg: 0 };
          loosePoolMap[rootId].items.push(item);
          loosePoolMap[rootId].totalKg += kgPerUnit * parseFloat(item.quantity);
        }
      }
    }
    // Validate each shared pool against the root product stock
    for (const [rootId, pool] of Object.entries(loosePoolMap)) {
      const rootRow = await queryOne('SELECT stock_quantity FROM products WHERE id = $1', [rootId]);
      const rootStock = rootRow ? parseFloat(rootRow.stock_quantity) : 0;
      if (pool.totalKg > rootStock) {
        const availableDisplay = rootStock < 1
          ? `${Math.round(rootStock * 1000)} g`
          : `${rootStock.toFixed(3)} kg`;
        for (const poolItem of pool.items) {
          issues.push({
            product_id: poolItem.product_id,
            product_name: poolItem.product_name,
            issue: `Only ${availableDisplay} available (shared across all sizes)`,
            type: 'insufficient_stock',
            available: rootStock,
          });
        }
      }
    }
    // Validate non-loose items individually
    for (const item of items) {
      if (!item.is_active) {
        issues.push({
          product_id: item.product_id,
          product_name: item.product_name,
          issue: "Product is no longer available",
          type: "unavailable",
        });
      } else if (item.unit_type !== 'loose' && parseFloat(item.stock_quantity) < parseFloat(item.quantity)) {
        issues.push({
          product_id: item.product_id,
          product_name: item.product_name,
          issue: `Only ${item.stock_quantity} in stock`,
          type: "insufficient_stock",
          available: parseFloat(item.stock_quantity),
        });
      }
    }
    return { valid: issues.length === 0, issues };
  }
  static async replaceAll(userId, items, userType = 'retail', wholesaleDiscountPct = 0) {
    const cart = await this.getOrCreate(userId);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return withTransaction(async (client) => {
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [
        cart.id,
      ]);
      for (const item of items) {
        // Skip items with malformed product IDs (e.g. stale localStorage from old app versions)
        if (!item.product_id || !uuidRegex.test(item.product_id)) continue;
        const product = await client.query(
          "SELECT price, wholesale_price, stock_quantity, is_active FROM products WHERE id = $1",
          [item.product_id],
        );
        if (!product.rows.length) continue;
        const p = product.rows[0];
        if (!p.is_active) continue;
        const qty = Math.min(item.quantity, p.stock_quantity);
        if (qty <= 0) continue;
        let unitPrice = parseFloat(p.price);
        if (userType === 'wholesale') {
          if (p.wholesale_price) {
            unitPrice = parseFloat(p.wholesale_price);
          } else if (wholesaleDiscountPct > 0) {
            unitPrice = parseFloat((unitPrice * (1 - wholesaleDiscountPct / 100)).toFixed(2));
          }
        }
        await client.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)",
          [cart.id, item.product_id, qty, unitPrice],
        );
      }
    });
  }
  static async getLooseReservedKgExcluding(userId, rootId, excludeProductId) {
    const cart = await queryOne('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart) return 0;
    const rows = await query(
      `SELECT ci.quantity, p.variant
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
         AND p.unit_type = 'loose'
         AND (p.id = $2 OR p.parent_product_id = $2)
         AND ci.product_id != $3`,
      [cart.id, rootId, excludeProductId],
    );
    let totalKg = 0;
    for (const row of rows) {
      const kg = parseVariantToKg(row.variant);
      if (kg !== null) totalKg += kg * parseFloat(row.quantity);
    }
    return totalKg;
  }
}
module.exports = Cart;
