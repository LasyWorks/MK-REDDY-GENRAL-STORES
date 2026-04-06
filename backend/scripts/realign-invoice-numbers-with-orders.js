#!/usr/bin/env node
/**
 * Realign invoice numbers with order numbers.
 * Rule: ORD-YYYYMMDD-12345 -> INV-YYYYMMDD-12345
 *
 * Run:
 *   node scripts/realign-invoice-numbers-with-orders.js
 */

const { withTransaction } = require('../src/config/database');

const ORDER_NUMBER_PATTERN = /^ORD-(\d{8})-(\d{5})$/;

function toInvoiceNumber(orderNumber) {
  const match = String(orderNumber || '').trim().match(ORDER_NUMBER_PATTERN);
  if (!match) return null;
  const [, datePart, suffix] = match;
  return `INV-${datePart}-${suffix}`;
}

async function realignInvoiceNumbersWithOrders() {
  try {
    console.log('Starting invoice number realignment...');

    await withTransaction(async (client) => {
      const rowsResult = await client.query(`
        SELECT i.id, i.invoice_number, i.order_id, o.order_number
        FROM invoices i
        JOIN orders o ON o.id = i.order_id
        ORDER BY i.created_at ASC
      `);

      const rows = rowsResult.rows;
      console.log(`Found ${rows.length} invoices linked to orders`);

      let updated = 0;
      let alreadyAligned = 0;
      let skippedInvalidOrderNumber = 0;

      for (const row of rows) {
        const expectedInvoiceNumber = toInvoiceNumber(row.order_number);

        if (!expectedInvoiceNumber) {
          skippedInvalidOrderNumber++;
          continue;
        }

        if (row.invoice_number === expectedInvoiceNumber) {
          alreadyAligned++;
          continue;
        }

        try {
          await client.query(
            `UPDATE invoices
             SET invoice_number = $1, updated_at = NOW()
             WHERE id = $2`,
            [expectedInvoiceNumber, row.id],
          );
          updated++;
        } catch (error) {
          if (error?.code === '23505') {
            throw new Error(
              `Duplicate invoice number conflict for order ${row.order_number} -> ${expectedInvoiceNumber}`,
            );
          }
          throw error;
        }
      }

      const verifyResult = await client.query(`
        SELECT COUNT(*)::int AS mismatched
        FROM invoices i
        JOIN orders o ON o.id = i.order_id
        WHERE i.invoice_number <> CONCAT('INV-', SUBSTRING(o.order_number FROM 5))
      `);

      const mismatched = verifyResult.rows[0]?.mismatched || 0;

      console.log('');
      console.log('Realignment summary:');
      console.log(`  Updated: ${updated}`);
      console.log(`  Already aligned: ${alreadyAligned}`);
      console.log(`  Skipped (invalid order number): ${skippedInvalidOrderNumber}`);
      console.log(`  Remaining mismatches: ${mismatched}`);

      if (mismatched > 0) {
        throw new Error(`Verification failed, ${mismatched} mismatches remain`);
      }

      const sample = await client.query(`
        SELECT o.order_number, i.invoice_number
        FROM invoices i
        JOIN orders o ON o.id = i.order_id
        ORDER BY i.updated_at DESC
        LIMIT 10
      `);

      console.log('');
      console.log('Sample mappings (order -> invoice):');
      for (const r of sample.rows) {
        console.log(`  ${r.order_number} -> ${r.invoice_number}`);
      }
    });

    console.log('');
    console.log('Invoice number realignment completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Invoice number realignment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  realignInvoiceNumbersWithOrders();
}

module.exports = realignInvoiceNumbersWithOrders;
