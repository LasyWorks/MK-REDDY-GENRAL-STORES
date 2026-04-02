const { query, modify } = require('../src/config/database');

(async () => {
  const rows = await query(`
    SELECT p.id,
           p.parent_product_id,
           COALESCE(parent_pt.name, pt.name, p.sku, 'Unknown') AS root_name,
           COALESCE(pt.name, p.sku, 'Unknown') AS child_name
    FROM products p
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
    LEFT JOIN products parent ON parent.id = p.parent_product_id
    LEFT JOIN product_translations parent_pt ON parent_pt.product_id = parent.id AND parent_pt.lang_code = 'en'
    WHERE p.unit_type = 'loose'
    ORDER BY p.parent_product_id NULLS FIRST, p.id
  `);

  const groups = new Map();
  for (const row of rows) {
    const key = row.parent_product_id || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const updated = [];

  for (const [rootId, group] of groups.entries()) {
    const rootName = group[0]?.root_name || 'Unknown';
    if (String(rootName).trim().toLowerCase() !== 'unknown') continue;
    if (group.length !== 1) continue;

    const childName = group[0]?.child_name;
    if (!childName) continue;

    await modify(
      `INSERT INTO product_translations (product_id, lang_code, name)
       VALUES ($1, 'en', $2)
       ON CONFLICT (product_id, lang_code)
       DO UPDATE SET name = EXCLUDED.name`,
      [rootId, childName]
    );
    updated.push({ rootId, name: childName });
  }

  console.log(JSON.stringify({ updatedCount: updated.length, updated }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
