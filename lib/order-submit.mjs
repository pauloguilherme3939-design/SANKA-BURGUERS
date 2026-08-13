export async function persistCheckout(payload, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Seu carrinho foi mantido.');
  }

  let data = {};
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const firstFieldError = data.fields && Object.values(data.fields)[0];
    throw new Error(firstFieldError || data.error || 'Não foi possível salvar o pedido. Seu carrinho foi mantido.');
  }
  if (!data.order?.id || !data.order?.pricing || !Array.isArray(data.order?.items)) {
    throw new Error('O servidor não confirmou a persistência do pedido. Seu carrinho foi mantido.');
  }
  return data.order;
}

export async function completeCheckout({ payload, persist = persistCheckout, onConfirmed }) {
  const persistedOrder = await persist(payload);
  await onConfirmed(persistedOrder);
  return persistedOrder;
}
