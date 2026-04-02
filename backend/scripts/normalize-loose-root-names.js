const { query, modify } = require('../src/config/database');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

(async () => {
  const rows = await query(`
    SELECT p.id,
           p.parent_product_id,
           p.sku,
           p.unit_type,
           p.unit_pack_size,
           COALESCE(parent_pt.name, pt.name, p.sku, 'Unknown') AS name,
           COALESCE(pt.name, p.sku, 'Unknown') AS child_name
    FROM products p
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
    LEFT JOIN products parent ON parent.id = p.parent_product_id
    LEFT JOIN product_translations parent_pt ON parent_pt.product_id = parent.id AND parent_pt.lang_code = 'en'
    WHERE p.unit_type = 'loose'
    ORDER BY COALESCE(parent_pt.name, pt.name, p.sku), p.unit_pack_size, p.id
  `);

  const groups = new Map();
  for (const row of rows) {
    const key = row.parent_product_id || row.id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  }

  const actions = [];
  const skipped = [];

  for (const [rootId, group] of groups.entries()) {
    const parentLabel = group[0]?.name || 'Unknown';
    if (normalizeName(parentLabel) !== 'unknown') continue;

    const childNames = group.map((row) => row.child_name).filter(Boolean);
    if (childNames.length === 0) {
      skipped.push({ rootId, reason: 'no child names' });
      continue;
    }

    const uniqueNames = [...new Set(childNames.map(normalizeName))];
    if (uniqueNames.length !== 1) {
      skipped.push({ rootId, reason: 'multiple child names', childNames: [...new Set(childNames)] });
      continue;
    }

    const bestName = childNames[0];
    await modify(
      `INSERT INTO product_translations (product_id, lang_code, name)
       VALUES ($1, 'en', $2)
       ON CONFLICT (product_id, lang_code)
       DO UPDATE SET name = EXCLUDED.name`,
      [rootId, bestName]
    );
    actions.push({ rootId, name: bestName, childCount: group.length });
  }

  console.log(JSON.stringify({ updated: actions.length, skipped, actions }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
