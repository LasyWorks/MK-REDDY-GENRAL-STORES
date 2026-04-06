#!/usr/bin/env node
/**
 * Fix order items: recalculate subtotal from unit_price × quantity
 * This corrects the issue where old orders show subtotal instead of final price
 * Run: node scripts/fix-order-items-subtotal.js
 */

const { query, queryOne, withTransaction } = require('../src/config/database');

const fixOrderItemsSubtotal = async () => {
  try {
    console.log('Starting fix of order items subtotal...');

    await withTransaction(async (client) => {
      // Get all order items and recalculate
      console.log('Fetching order items...');
      const itemsResult = await client.query(`
        SELECT id, unit_price, quantity FROM order_items ORDER BY id
      `);

      const items = itemsResult.rows;
      console.log(`Found ${items.length} order items to process`);

      let fixed = 0;
      for (const item of items) {
        const correctSubtotal = parseFloat((item.unit_price * item.quantity).toFixed(2));
        
        // Update each item with correct subtotal (and total = subtotal since GST is 0)
        const updateResult = await client.query(`
          UPDATE order_items
          SET 
            subtotal = $1,
            total = $1,
            gst_percentage = 0,
            gst_amount = 0
          WHERE id = $2
        `, [correctSubtotal, item.id]);

        if (updateResult.rowCount > 0) {
          fixed++;
        }
      }

      console.log(`✓ Fixed ${fixed} order items`);

      // Recalculate order totals based on corrected items
      console.log('Recalculating order totals...');
      const ordersResult = await client.query(`
        UPDATE orders o
        SET 
          subtotal = (
            SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = o.id
          ),
          total_gst = 0,
          total_amount = (
            SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = o.id
          ),
          updated_at = NOW()
      `);

      console.log(`✓ Recalculated ${ordersResult.rowCount} order totals`);

      // Recalculate invoice totals
      console.log('Recalculating invoice totals...');
      const invoicesResult = await client.query(`
        UPDATE invoices i
        SET 
          subtotal = (
            SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = i.order_id
          ),
          cgst = 0,
          sgst = 0,
          total_gst = 0,
          total_amount = (
            SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = i.order_id
          ),
          updated_at = NOW()
      `);

      console.log(`✓ Recalculated ${invoicesResult.rowCount} invoice totals`);

      // Verify
      console.log('Verifying...');
      const sample = await client.query(`
        SELECT 
          oi.unit_price,
          oi.quantity,
          oi.subtotal,
          oi.total,
          oi.gst_percentage,
          oi.gst_amount
        FROM order_items oi
        LIMIT 5
      `);

      console.log('Sample order items after fix:');
      sample.rows.forEach(row => {
        console.log(`  Price: ${row.unit_price} × Qty: ${row.quantity} = Subtotal: ${row.subtotal} (GST: ${row.gst_percentage}%)`);
      });

      console.log('✓ All order items fixed successfully!');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error fixing order items:', error.message);
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  fixOrderItemsSubtotal();
}

module.exports = fixOrderItemsSubtotal;
