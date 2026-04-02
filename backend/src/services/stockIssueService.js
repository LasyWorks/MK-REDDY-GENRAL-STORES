const { query } = require("../config/database");

const ACTIVE_STOCK_ISSUE_ROWS_SQL = `
  SELECT p.id, p.parent_product_id, p.unit_type, p.sku, p.variant, p.unit_pack_size,
         p.stock_quantity, p.low_stock_threshold,
         p.price,
         COALESCE(pt.name, p.sku, 'Unknown') AS name,
         ct_en.name AS category,
         parent.stock_quantity AS parent_stock_quantity,
         parent.low_stock_threshold AS parent_low_stock_threshold,
         CASE
           WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
             THEN COALESCE(parent.stock_quantity, p.stock_quantity)
           ELSE p.stock_quantity
         END AS effective_stock_quantity,
         CASE
           WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
             THEN COALESCE(parent.low_stock_threshold, p.low_stock_threshold, 10)
           ELSE COALESCE(p.low_stock_threshold, 10)
         END AS effective_low_stock_threshold,
         COALESCE(parent_pt.name, pt.name, p.sku, 'Unknown') AS root_name
  FROM products p
  LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.lang_code = 'en'
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN category_translations ct_en ON ct_en.category_id = c.id AND ct_en.lang_code = 'en'
  LEFT JOIN products parent ON parent.id = p.parent_product_id
  LEFT JOIN product_translations parent_pt ON parent_pt.product_id = parent.id AND parent_pt.lang_code = 'en'
  WHERE p.is_active = TRUE
    AND (
      CASE
        WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
          THEN COALESCE(parent.stock_quantity, p.stock_quantity)
        ELSE p.stock_quantity
      END
    ) <= (
      CASE
        WHEN p.unit_type = 'loose' AND p.parent_product_id IS NOT NULL
          THEN COALESCE(parent.low_stock_threshold, p.low_stock_threshold, 10)
        ELSE COALESCE(p.low_stock_threshold, 10)
      END
    )
  ORDER BY p.stock_quantity ASC
`;

function normalizeIssueRow(row) {
  const stock = parseFloat(row.effective_stock_quantity ?? row.stock_quantity ?? 0);
  const threshold = parseFloat(row.effective_low_stock_threshold ?? row.low_stock_threshold ?? 10);
  return {
    id: row.id,
    parent_product_id: row.parent_product_id || null,
    name: row.name,
    root_name: row.root_name || row.name,
    category: row.category || null,
    sku: row.sku,
    variant: row.variant,
    unit_pack_size: row.unit_pack_size,
    unit_type: row.unit_type || null,
    stock_quantity: stock,
    low_stock_threshold: threshold,
    price: row.price != null ? parseFloat(row.price) : null,
    alertType: stock <= 0 ? "out" : "low",
  };
}

function getIssuePoolRootId(row) {
  return row.parent_product_id || row.id;
}

function getIssueMemberLabel(issue) {
  return issue.unit_pack_size || issue.variant || issue.sku || issue.name;
}

function groupStockIssues(rows = []) {
  const groupsByRoot = new Map();

  for (const rawRow of rows.map(normalizeIssueRow)) {
    const rootId = getIssuePoolRootId(rawRow);
    const existing = groupsByRoot.get(rootId);
    const memberLabel = getIssueMemberLabel(rawRow);

    if (!existing) {
      groupsByRoot.set(rootId, {
        id: rootId,
        root_product_id: rootId,
        name: rawRow.root_name || rawRow.name,
        category: rawRow.category || null,
        sku: rawRow.sku,
        variant: rawRow.variant,
        unit_pack_size: rawRow.unit_pack_size,
        stock_quantity: rawRow.stock_quantity,
        low_stock_threshold: rawRow.low_stock_threshold,
        price: rawRow.price,
        alertType: rawRow.alertType,
        rowCount: 1,
        memberLabels: [memberLabel],
        members: [rawRow],
      });
      continue;
    }

    existing.rowCount += 1;
    existing.members.push(rawRow);
    if (!existing.memberLabels.includes(memberLabel)) {
      existing.memberLabels.push(memberLabel);
    }
    // Keep the first effective stock/threshold from the root pool. Child loose rows
    // should not overwrite the shared parent pool stock.
    existing.alertType = existing.stock_quantity <= 0 ? "out" : "low";
  }

  return [...groupsByRoot.values()].sort((a, b) => a.stock_quantity - b.stock_quantity);
}

async function getActiveStockIssueRows() {
  const rows = await query(ACTIVE_STOCK_ISSUE_ROWS_SQL);
  return rows.map(normalizeIssueRow);
}

async function getActiveStockIssues() {
  const rows = await getActiveStockIssueRows();
  return groupStockIssues(rows);
}

function summarizeStockIssues(issues = []) {
  const outCount = issues.filter((i) => i.alertType === "out").length;
  const lowCount = issues.length - outCount;
  return {
    outCount,
    lowCount,
    totalCount: issues.length,
  };
}

function buildStockDigestMessage(issues = [], maxItems = 8) {
  const { outCount, lowCount, totalCount } = summarizeStockIssues(issues);
  const sample = issues
    .slice(0, maxItems)
    .map((i) => {
      const memberSummary = Array.isArray(i.memberLabels) && i.memberLabels.length > 0
        ? i.memberLabels.join(", ")
        : (i.unit_pack_size || i.variant || "");
      const label = memberSummary ? `${i.name} - ${memberSummary}` : i.name;
      return `${label} (${i.stock_quantity})`;
    })
    .join(", ");

  return `Out of stock: ${outCount}, Low stock: ${lowCount}. Items: ${sample}${totalCount > maxItems ? ", ..." : ""}`;
}

module.exports = {
  getActiveStockIssueRows,
  getActiveStockIssues,
  groupStockIssues,
  summarizeStockIssues,
  buildStockDigestMessage,
};
