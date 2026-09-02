export function getCartSuggestions(items = [], catalog = []) {
  const ids = new Set(items.map(item => String(item?.id || '')));
  const hasBurger = [...ids].some(id => id.startsWith('SK-L'));
  const hasCombo = [...ids].some(id => id.startsWith('SK-C'));
  if (!hasBurger || hasCombo) return [];

  const candidates = ['SK-P01', 'SK-B01'];
  return candidates.flatMap(id => {
    if (ids.has(id)) return [];
    const product = catalog.find(item => String(item?.id || item?.code || '') === id);
    return product && !product.purchaseDisabled ? [product] : [];
  });
}
