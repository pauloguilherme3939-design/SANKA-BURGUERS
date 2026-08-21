async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Não foi possível conectar à Roleta agora.');
  }
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || 'A Roleta não conseguiu concluir a operação.');
    error.code = data.code || 'ROULETTE_REQUEST_FAILED';
    throw error;
  }
  return data;
}

export function getRouletteConfig() {
  return requestJson('/api/roleta?action=config', { headers: { Accept: 'application/json' } });
}

export function spinRoulette(phone) {
  return requestJson('/api/roleta?action=spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}

export function consumeRoulettePrize(code, orderId) {
  return requestJson('/api/roleta?action=consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, orderId }),
  });
}
