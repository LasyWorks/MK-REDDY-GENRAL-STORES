const { query } = require('../src/config/database');

(async () => {
  const sql = `
    SELECT p.id, p.sku, p.variant, p.unit_type, p.unit_pack_size,
           p.stock_quantity, p.low_stock_threshold, p.parent_product_id,
           COALESCE(pt.name, p.sku, 'Unknown') AS name,
           parent.stock_quantity AS parent_stock,
           parent.low_stock_threshold AS parent_threshold,
           COALESCE(parent_pt.name, parent.sku, 'Unknown') AS parent_name
    FROM products p
    LEFT JOIN products parent ON parent.id = p.parent_product_id
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
    LEFT JOIN product_translations parent_pt ON parent_pt.product_id = parent.id AND parent_pt.lang_code = 'en'
    WHERE p.unit_type = 'loose'
    ORDER BY COALESCE(parent_pt.name, pt.name, p.sku), p.unit_pack_size, p.id
  `;

  const rows = await query(sql);
  const groups = new Map();

  for (const row of rows) {
    const key = row.parent_product_id || row.id;
    if (!groups.get(key)) {
      groups.set(key, {
        parent_name: row.parent_name || row.name,
        parent_id: row.parent_product_id || row.id,
        parent_stock: row.parent_stock,
        parent_threshold: row.parent_threshold,
        children: [],
      });
    }
    groups.get(key).children.push(row);
  }

  const result = [...groups.values()].map((group) => ({
    parent: group.parent_name,
    parent_id: group.parent_id,
    parent_stock: group.parent_stock,
    parent_threshold: group.parent_threshold,
    child_count: group.children.length,
    children: group.children.map((child) => ({
      name: child.name,
      size: child.unit_pack_size,
      stock: child.stock_quantity,
      child_threshold: child.low_stock_threshold,
      sku: child.sku,
    })),
  }));

  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
