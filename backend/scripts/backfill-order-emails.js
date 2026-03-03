/**
 * backfill-order-emails.js
 *
 * Finds every order that was never emailed and sends:
 *  - Admin notification  → all admin users with an email address
 *  - Customer confirmation → customer (if they have email)
 *
 * Usage:
 *   node scripts/backfill-order-emails.js
 *   node scripts/backfill-order-emails.js --dry-run   (print only, no sends)
 *   node scripts/backfill-order-emails.js --limit 20  (cap at N orders)
 */

require('dotenv').config();
const { query } = require('../src/config/database');
const { Order, Invoice, User } = require('../src/models');
const emailService = require('../src/services/emailService');

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit=') || a === '--limit');
let LIMIT = 100;
if (limitArg) {
  const idx = process.argv.indexOf('--limit');
  LIMIT = idx !== -1
    ? parseInt(process.argv[idx + 1], 10) || 100
    : parseInt(limitArg.split('=')[1], 10) || 100;
}

async function main() {
  console.log(`\n📬  Order email backfill${DRY_RUN ? ' [DRY RUN]' : ''} — limit: ${LIMIT}\n`);

  // Find orders that have no invoice email sent yet
  const rows = await query(
    `SELECT DISTINCT o.id AS order_id, o.user_id, o.created_at
     FROM orders o
     LEFT JOIN invoices i ON i.order_id = o.id
     WHERE (i.email_sent IS NULL OR i.email_sent = FALSE)
       AND o.status NOT IN ('cancelled')
     ORDER BY o.created_at ASC
     LIMIT $1`,
    [LIMIT]
  );

  if (!rows.length) {
    console.log('✅  No unsent order emails found.');
    process.exit(0);
  }

  console.log(`Found ${rows.length} order(s) missing emails.\n`);

  const adminEmails = await User.findAdminEmails();
  if (!adminEmails.length) {
    console.warn('⚠️  No admin users with email found in DB. Will skip admin notifications.');
  } else {
    console.log(`Admin recipients (${adminEmails.length}): ${adminEmails.join(', ')}\n`);
  }

  let okAdmin = 0, okCustomer = 0, errAdmin = 0, errCustomer = 0;

  for (const row of rows) {
    const order = await Order.findById(row.order_id);
    if (!order) continue;
    const customer = await User.findById(row.user_id);
    if (!customer) continue;

    console.log(`  Order ${order.order_number} — customer: ${customer.name} (${customer.email || 'no email'})`);

    if (DRY_RUN) continue;

    // Admin notification
    if (adminEmails.length) {
      try {
        await emailService.sendAdminOrderNotification(order, customer, adminEmails);
        console.log(`    ✓ Admin notification sent to ${adminEmails.length} admin(s)`);
        okAdmin++;
      } catch (e) {
        console.error(`    ✗ Admin email failed:`, e.message);
        errAdmin++;
      }
    }

    // Customer confirmation
    if (customer.email) {
      try {
        await emailService.sendOrderConfirmation(order, customer);
        console.log(`    ✓ Customer confirmation sent to ${customer.email}`);
        okCustomer++;
      } catch (e) {
        console.error(`    ✗ Customer email failed:`, e.message);
        errCustomer++;
      }
    } else {
      console.log(`    — Customer has no email, skipping`);
    }

    // Small delay to avoid SMTP rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📊  Summary:`);
  console.log(`   Admin emails   — sent: ${okAdmin}, failed: ${errAdmin}`);
  console.log(`   Customer emails — sent: ${okCustomer}, failed: ${errCustomer}`);
  console.log('\nDone.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
