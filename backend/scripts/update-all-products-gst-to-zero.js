#!/usr/bin/env node
/**
 * Update all existing products to have 0% GST
 * This ensures price = final invoice amount (no tax)
 * Run: node scripts/update-all-products-gst-to-zero.js
 */

const { query, queryOne } = require('../src/config/database');

const updateAllProductsGst = async () => {
  try {
    console.log('Starting update of all products GST to 0%...');

    // Get count of products with non-zero GST
    const countResult = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE gst_percentage != 0'
    );
    const countToUpdate = parseInt(countResult.count, 10);

    if (countToUpdate === 0) {
      console.log('✓ All products already have 0% GST');
      process.exit(0);
    }

    console.log(`Found ${countToUpdate} products with non-zero GST`);
    console.log('Updating all products to 0% GST...');

    // Update all products to 0% GST
    const result = await query(
      'UPDATE products SET gst_percentage = 0, updated_at = NOW() WHERE gst_percentage != 0'
    );

    console.log(`✓ Updated ${result.rowCount} products to 0% GST`);

    // Verify the update
    const verifyResult = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE gst_percentage = 0'
    );
    const totalWithZeroGst = parseInt(verifyResult.count, 10);

    console.log(`✓ Verification: ${totalWithZeroGst} products now have 0% GST`);
    console.log('✓ Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating products GST:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  updateAllProductsGst();
}

module.exports = updateAllProductsGst;
