/**
 * Link Product Variants Script
 * 
 * Finds products with the same name in the same category
 * and links them via parent_product_id.
 * 
 * The cheapest (smallest size) product becomes the parent,
 * all others get parent_product_id set to the parent's id.
 * 
 * Usage: node scripts/link-product-variants.js [--dry-run]
 */
const db = require('../src/config/database');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LINKING VARIANTS ===');

  // Find all product groups sharing the same name within the same category
  const groups = await db.query(`
    SELECT pt.name, p.category_id, COUNT(*) as cnt,
           array_agg(p.id ORDER BY p.price ASC) as product_ids
    FROM products p
    JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
    WHERE p.is_active = true
    GROUP BY LOWER(TRIM(pt.name)), pt.name, p.category_id
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `);

  console.log(`\nFound ${groups.length} product groups with multiple variants:\n`);

  let totalLinked = 0;

  for (const group of groups) {
    const { name, category_id, cnt, product_ids } = group;
    const parentId = product_ids[0]; // cheapest = parent
    const childIds = product_ids.slice(1);

    // Get details for display
    const details = await db.query(`
      SELECT p.id, pt.name, p.unit_pack_size, p.price, p.mrp, p.brand, p.parent_product_id
      FROM products p
      JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
      WHERE p.id = ANY($1)
      ORDER BY p.price ASC
    `, [product_ids]);

    console.log(`  "${name}" (${cnt} variants):`);
    details.forEach((d, i) => {
      const role = d.id === parentId ? 'PARENT' : 'CHILD';
      const current = d.parent_product_id ? ` (already linked to ${d.parent_product_id})` : '';
      console.log(`    ${role}: ${d.unit_pack_size || 'N/A'} - ₹${d.price} (MRP ₹${d.mrp}) [${d.id}]${current}`);
    });

    // Check if already properly linked
    const alreadyLinked = childIds.every(cid => {
      const detail = details.find(d => d.id === cid);
      return detail && detail.parent_product_id === parentId;
    });

    if (alreadyLinked) {
      console.log(`    ✓ Already properly linked\n`);
      continue;
    }

    if (!DRY_RUN) {
      // Set parent's parent_product_id to NULL (it IS the parent)
      await db.query(`UPDATE products SET parent_product_id = NULL WHERE id = $1`, [parentId]);

      // Set children's parent_product_id to the parent
      for (const childId of childIds) {
        await db.query(`UPDATE products SET parent_product_id = $1 WHERE id = $2`, [parentId, childId]);
      }

      console.log(`    → Linked ${childIds.length} children to parent\n`);
    } else {
      console.log(`    → Would link ${childIds.length} children to parent\n`);
    }

    totalLinked += childIds.length;
  }

  console.log(`\n${DRY_RUN ? 'Would link' : 'Linked'} ${totalLinked} products as variants.`);
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
