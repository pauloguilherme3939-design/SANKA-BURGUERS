const TERMINAL_STATUSES = new Set(['entregue', 'cancelado']);

export function summarizeOrders(orders = []) {
  const visible = orders.filter(order => !order?.archived);
  const billable = visible.filter(order => order?.status !== 'cancelado' && Number.isFinite(Number(order?.pricing?.total)));
  const grossValue = billable.reduce((sum, order) => sum + Number(order.pricing.total), 0);
  const statusCounts = visible.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {});

  return {
    total: visible.length,
    active: visible.filter(order => !TERMINAL_STATUSES.has(order.status)).length,
    delivered: statusCounts.entregue || 0,
    cancelled: statusCounts.cancelado || 0,
    pickup: visible.filter(order => order.status !== 'cancelado' && order.fulfillment?.type !== 'delivery').length,
    delivery: visible.filter(order => order.status !== 'cancelado' && order.fulfillment?.type === 'delivery').length,
    grossValue: Number(grossValue.toFixed(2)),
    averageTicket: billable.length ? Number((grossValue / billable.length).toFixed(2)) : 0,
    statusCounts,
  };
}

export function sortActiveOldestFirst(orders = []) {
  return [...orders].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function elapsedLabel(createdAt, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 'tempo indisponível';
  const minutes = Math.max(0, Math.floor((now - created) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function buildAdminWhatsAppUrl(order) {
  const phone = String(order?.customer?.phone || '').replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(phone)) return '';

  const customer = String(order?.customer?.name || 'cliente').trim();
  const id = String(order?.id || '').trim();
  const statusMessages = {
    recebido: `Olá, ${customer}! Seu pedido #${id} foi recebido pela Sanka Burgers.`,
    preparando: `Olá, ${customer}! Seu pedido #${id} já está em preparo.`,
    na_chapa: `Olá, ${customer}! Seu pedido #${id} está na chapa.`,
    finalizando: `Olá, ${customer}! Seu pedido #${id} está sendo finalizado.`,
    saiu_entrega: order?.fulfillment?.type === 'delivery'
      ? `Olá, ${customer}! Seu pedido #${id} saiu para entrega.`
      : `Olá, ${customer}! Seu pedido #${id} está pronto para retirada.`,
    entregue: `Olá, ${customer}! O pedido #${id} foi concluído. Obrigado por escolher a Sanka Burgers!`,
    cancelado: `Olá, ${customer}. Precisamos falar sobre o pedido #${id}.`,
  };
  const message = statusMessages[order?.status] || `Olá, ${customer}! Estamos falando sobre o pedido #${id}.`;
  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}
