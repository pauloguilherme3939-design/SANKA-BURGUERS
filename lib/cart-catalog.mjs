export function reconcileCartItems(storedItems, catalogItems) {
  if (!Array.isArray(storedItems) || !Array.isArray(catalogItems)) return [];

  const catalogById = new Map(
    catalogItems
      .filter((item) => item && (item.id || item.code))
      .map((item) => [String(item.id || item.code), item]),
  );

  return storedItems.flatMap((stored) => {
    const id = String(stored?.id || '');
    const current = catalogById.get(id);
    const qty = Number(stored?.qty);

    if (!current || !Number.isInteger(qty) || qty < 1 || current.purchaseDisabled) return [];

    return [{
      id,
      name: String(current.name || ''),
      price: Number(current.price),
      qty,
      obs: typeof stored.obs === 'string' ? stored.obs.slice(0, 120) : '',
      tags: current.tags || '',
    }];
  });
}
