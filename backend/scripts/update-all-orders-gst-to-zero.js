#!/usr/bin/env node
/**
 * Update all existing orders and invoices to have 0% GST
 * This recalculates all totals to exclude tax (price = final amount)
 * Run: node scripts/update-all-orders-gst-to-zero.js
 */

const { query, queryOne, withTransaction } = require('../src/config/database');

const updateAllOrdersGst = async () => {
  try {
    console.log('Starting update of all orders to 0% GST...');

    await withTransaction(async (client) => {
      // 1. Count orders with non-zero GST
      const orderCountResult = await client.query(
        'SELECT COUNT(*) as count FROM orders WHERE total_gst != 0'
      );
      const ordersToUpdate = parseInt(orderCountResult.rows[0].count, 10);

      if (ordersToUpdate === 0) {
        console.log('✓ All orders already have 0% GST');
        return;
      }

      console.log(`Found ${ordersToUpdate} orders with non-zero GST`);

      // 2. Update order_items: set GST to 0 and recalculate totals
      console.log('Updating order items...');
      const itemsResult = await client.query(`
        UPDATE order_items
        SET 
          gst_percentage = 0,
          gst_amount = 0,
          total = subtotal
        WHERE gst_percentage != 0 OR gst_amount != 0
      `);
      console.log(`  ✓ Updated ${itemsResult.rowCount} order items`);

      // 3. Update orders: recalculate total_gst and total_amount
      console.log('Updating orders...');
      const ordersResult = await client.query(`
        UPDATE orders
        SET 
          total_gst = 0,
          total_amount = subtotal,
          updated_at = NOW()
        WHERE total_gst != 0 OR total_amount != subtotal
      `);
      console.log(`  ✓ Updated ${ordersResult.rowCount} orders`);

      // 4. Update invoices: recalculate GST and totals
      console.log('Updating invoices...');
      const invoicesResult = await client.query(`
        UPDATE invoices
        SET 
          cgst = 0,
          sgst = 0,
          total_gst = 0,
          total_amount = subtotal,
          updated_at = NOW()
        WHERE total_gst != 0 OR total_amount != subtotal
      `);
      console.log(`  ✓ Updated ${invoicesResult.rowCount} invoices`);

      // 5. Verify updates
      console.log('Verifying updates...');
      
      const verifyOrders = await client.query(
        'SELECT COUNT(*) as count FROM orders WHERE total_gst = 0'
      );
      const ordersWithZeroGst = parseInt(verifyOrders.rows[0].count, 10);
      
      const verifyItems = await client.query(
        'SELECT COUNT(*) as count FROM order_items WHERE gst_percentage = 0'
      );
      const itemsWithZeroGst = parseInt(verifyItems.rows[0].count, 10);
      
      const verifyInvoices = await client.query(
        'SELECT COUNT(*) as count FROM invoices WHERE total_gst = 0'
      );
      const invoicesWithZeroGst = parseInt(verifyInvoices.rows[0].count, 10);

      console.log(`✓ Verification:`);
      console.log(`  - ${ordersWithZeroGst} orders with 0% GST`);
      console.log(`  - ${itemsWithZeroGst} order items with 0% GST`);
      console.log(`  - ${invoicesWithZeroGst} invoices with 0% GST`);

      console.log('✓ All orders updated successfully!');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error updating orders GST:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  updateAllOrdersGst();
}

module.exports = updateAllOrdersGst;
