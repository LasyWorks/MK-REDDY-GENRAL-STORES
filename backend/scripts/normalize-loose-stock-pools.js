const { query, modify } = require('../src/config/database');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

(async () => {
  const rows = await query(`
    SELECT p.id,
           p.sku,
           p.stock_quantity,
           p.low_stock_threshold,
           p.unit_type,
           p.unit_pack_size,
           p.parent_product_id,
           p.created_at,
           COALESCE(pt.name, p.sku, 'Unknown') AS name
    FROM products p
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
    WHERE p.unit_type = 'loose'
      AND p.parent_product_id IS NULL
    ORDER BY LOWER(COALESCE(pt.name, p.sku, 'Unknown')), p.created_at ASC, p.id ASC
  `);

  const groups = new Map();
  for (const row of rows) {
    const key = normalizeName(row.name);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  }

  const plan = [];
  const updates = [];

  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue;

    const root = group.find((row) => row.unit_pack_size == null) || group[0];
    const children = group.filter((row) => row.id !== root.id);
    if (!children.length) continue;

    plan.push({
      group: key,
      root: { id: root.id, name: root.name, sku: root.sku, stock: root.stock_quantity },
      children: children.map((row) => ({ id: row.id, name: row.name, sku: row.sku, stock: row.stock_quantity })),
    });

    for (const child of children) {
      updates.push(modify('UPDATE products SET parent_product_id = $1 WHERE id = $2', [root.id, child.id]));
    }
  }

  if (!updates.length) {
    console.log(JSON.stringify({ updated: 0, groups: [] }, null, 2));
    return;
  }

  await Promise.all(updates);
  console.log(JSON.stringify({ updated: updates.length, groups: plan }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
