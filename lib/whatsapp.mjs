// Só constrói links. Nunca abre janelas nem envia mensagens.
export function buildWhatsAppLink(number, message = '') {
  if (!/^55\d{10,11}$/.test(number)) throw new Error('WhatsApp da loja inválido.');
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function safeWhatsAppLink(number, message = '') {
  try { return buildWhatsAppLink(number, message); }
  catch { return null; }
}

function brl(n) { return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// Extraído do checkout sem alterar o conteúdo comercial. Usa apenas o pedido persistido.
export function buildOrderWhatsAppMessage(order, storeLocation, rouletteRedemption = null) {
  const { customer, fulfillment, payment, coupon, items, pricing } = order;
  const lines = [
    '*🍔 PEDIDO SANKA BURGERS*', '', `*Pedido:* #${order.id}`,
    `*Cliente:* ${customer.name}`, `*Telefone:* ${customer.phone}`,
    '*Situação:* Aguardando confirmação da Sanka',
    `*Modalidade:* ${fulfillment.type === 'delivery' ? 'Delivery — disponibilidade a confirmar' : 'Retirada no local — sem taxa de entrega'}`, '---',
  ];
  items.forEach(item => {
    lines.push(`${item.quantity}× ${item.name} — ${brl(item.lineTotal)}`);
    if (item.note) lines.push(`  _Obs: ${item.note}_`);
  });
  lines.push('---', `Subtotal: ${brl(pricing.subtotal)}`);
  if (pricing.discount > 0) lines.push(`Desconto (${coupon?.code}): -${brl(pricing.discount)}`);
  lines.push(fulfillment.type === 'delivery'
    ? (pricing.deliveryFee === null ? 'Delivery: área atendida e taxa a confirmar no WhatsApp' : pricing.deliveryFee === 0 ? 'Entrega: Grátis' : `Entrega: ${brl(pricing.deliveryFee)}`)
    : 'Entrega: Retirada no local');
  const rouletteBenefit = rouletteRedemption?.benefit;
  if (rouletteBenefit?.type === 'discount') lines.push(`Roleta Sanka (${rouletteBenefit.label}): -${brl(rouletteBenefit.discountAmount)}`);
  else if (rouletteBenefit?.type === 'free_item') lines.push(`Roleta Sanka: ${rouletteBenefit.freeItem.quantity}× ${rouletteBenefit.freeItem.name}`);
  if (rouletteRedemption?.code) lines.push(`Código da Roleta: ${rouletteRedemption.code}`);
  const displayedTotal = rouletteBenefit ? rouletteBenefit.totalAfterBenefit : pricing.total;
  lines.push(pricing.totalIsFinal ? `*TOTAL: ${brl(displayedTotal)}*` : `*SUBTOTAL DOS ITENS: ${brl(displayedTotal)}*`);
  if (!pricing.totalIsFinal) lines.push('_O total final depende da confirmação da taxa de entrega._');
  const pagLabel = payment.method === 'pix' ? 'Pix'
    : payment.method === 'card' ? (fulfillment.type === 'pickup' ? 'Cartão na retirada' : 'Cartão na entrega')
    : `Dinheiro${payment.change ? ` (troco: ${payment.change})` : ''}`;
  lines.push(`Pagamento: ${pagLabel}`);
  if (fulfillment.type === 'delivery') {
    const address = fulfillment.address;
    lines.push('', `*Endereço:* ${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ''}`,
      `${address.neighborhood} · CEP ${address.cep}`);
    if (address.reference) lines.push(`Referência: ${address.reference}`);
  } else lines.push('', `*Retirar em:* ${storeLocation.fullAddress}`, `Como chegar: ${storeLocation.mapsUrl}`);
  lines.push('', `Origem: ${order.origin || 'direto'}`);
  return lines.join('\n');
}
