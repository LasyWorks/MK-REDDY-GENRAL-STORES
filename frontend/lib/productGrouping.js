/**
 * Group products by name and brand to identify variants
 * Products with same name and brand are considered variants of each other
 * 
 * @param {Array} products - Array of product objects
 * @returns {Array} - Array of product groups, each containing variants
 */
export function groupProductsByVariant(products) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const groups = {};

  products.forEach(product => {
    // Create a unique key based on name and brand (case-insensitive, trimmed)
    const name = (product.name || '').toLowerCase().trim();
    const brand = (product.brand || '').toLowerCase().trim();
    const key = `${brand}_${name}`;

    if (!groups[key]) {
      groups[key] = {
        name: product.name,
        brand: product.brand,
        variants: [],
        // Use first variant's image as representative image
        image_url: product.image_url,
        category_id: product.category_id,
        category_name: product.category_name,
      };
    }

    groups[key].variants.push(product);
  });

  // Convert to array and sort variants within each group
  return Object.values(groups).map(group => {
    // Sort variants by variant name or price
    group.variants.sort((a, b) => {
      // Try to sort by numeric value in variant name (e.g., 500g before 1kg)
      const aNum = parseVariantNumber(a.variant || a.unit_pack_size || '');
      const bNum = parseVariantNumber(b.variant || b.unit_pack_size || '');
      
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      
      // Fallback to price sorting
      return parseFloat(a.price || 0) - parseFloat(b.price || 0);
    });

    return group;
  });
}

/**
 * Extract numeric value from variant string for sorting
 * e.g., "500g" -> 500, "1kg" -> 1000, "2L" -> 2000
 */
function parseVariantNumber(variantStr) {
  if (!variantStr) return null;
  
  const str = variantStr.toLowerCase().trim();
  const match = str.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pc|piece)/);
  
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  const unit = match[2];
  
  // Normalize to grams/ml for consistent comparison
  switch (unit) {
    case 'kg': return num * 1000;
    case 'l': return num * 1000;
    case 'g':
    case 'ml':
    default:
      return num;
  }
}

/**
 * Check if products should be grouped (have same name and brand)
 */
export function shouldGroupProducts(products) {
  if (!Array.isArray(products) || products.length <= 1) return false;
  
  const groups = groupProductsByVariant(products);
  // If grouping reduces the count, it means there are variants
  return groups.length < products.length;
}
