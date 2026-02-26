export function groupProductsByVariant(products) {
  if (!Array.isArray(products) || products.length === 0) return [];
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
    group.variants.sort((a, b) => {
      const aNum = parseVariantNumber(a.variant || a.unit_pack_size || '');
      const bNum = parseVariantNumber(b.variant || b.unit_pack_size || '');
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      return parseFloat(a.price || 0) - parseFloat(b.price || 0);
    });
    return group;
  });
}
function parseVariantNumber(variantStr) {
  if (!variantStr) return null;
  const str = variantStr.toLowerCase().trim();
  const match = str.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pcs|pc|piece)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
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
  return groups.length < products.length;
}