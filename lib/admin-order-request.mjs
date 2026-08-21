export async function requestAdminOrderUpdate({ orderId, token, payload, fetchImpl = fetch }) {
  const response = await fetchImpl(`/api/pedido?id=${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data?.error || 'Não foi possível atualizar o pedido.');
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}
