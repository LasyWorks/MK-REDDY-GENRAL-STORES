export function groupProductsByVariant(products) {
  if (!Array.isArray(products) || products.length === 0) return [];
  // Group products by brand+name to show variants together (e.g., "Vim 500g" and "Vim 1kg")
  const groups = {};
  products.forEach(product => {
    const name = (product.name || '').toLowerCase().trim();
    const brand = (product.brand || '').toLowerCase().trim();
    const key = `${brand}_${name}`;
    if (!groups[key]) {
      groups[key] = {
        name: product.name,
        brand: product.brand,
        variants: [],
        image_url: product.image_url,
        category_id: product.category_id,
        category_name: product.category_name,
      };
    }
    groups[key].variants.push(product);
  });
  return Object.values(groups).map(group => {
    // Sort variants by size (small to large) for better user experience
    group.variants.sort((a, b) => {
      const aNum = parseVariantNumber(a.variant || a.unit_pack_size || '');
      const bNum = parseVariantNumber(b.variant || b.unit_pack_size || '');
      // If both have parseable sizes (e.g., "500g", "1kg"), sort numerically
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      // Otherwise sort by price as fallback
      return parseFloat(a.price || 0) - parseFloat(b.price || 0);
    });
    return group;
  });
}
function parseVariantNumber(variantStr) {
  if (!variantStr) return null;
  const str = variantStr.toLowerCase().trim();
  // Extract number and unit from strings like "500g", "1.5kg", "5 pieces"
  const match = str.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pc|piece)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  // Normalize to base unit (grams/ml) for consistent sorting
  switch (unit) {
    case 'kg': return num * 1000;
    case 'l': return num * 1000;
    case 'g':
    case 'ml':
    default:
      return num;
  }
}
export function shouldGroupProducts(products) {
  if (!Array.isArray(products) || products.length <= 1) return false;
  const groups = groupProductsByVariant(products);
  // Only group if it actually reduces the number of items shown (i.e., variants exist)
  return groups.length < products.length;
}
