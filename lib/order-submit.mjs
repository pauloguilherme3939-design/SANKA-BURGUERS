import { getCheckoutCoordinator } from './checkout-coordinator.mjs';
export async function checkoutAttempt(payload,coordinator=getCheckoutCoordinator(),revision=coordinator.snapshot().revision) {
  return coordinator.prepare(payload,revision);
}
export function pendingCheckoutPayload(coordinator=getCheckoutCoordinator(),revision) {
  return coordinator.pendingPayload(revision);
}
export async function persistCheckout(payload,fetchImpl=fetch,{coordinator=getCheckoutCoordinator(),attempt,revision=coordinator.snapshot().revision}={}) {
  const captured=attempt||await coordinator.prepare(payload,revision);
  let response;
  try {
    response=await fetchImpl('/api/pedido',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':captured.key},body:JSON.stringify(captured.payload)});
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Seu carrinho e sua tentativa foram mantidos.');
  }
  let data={};try{data=await response.json();}catch{}
  if(!response.ok){
    if(response.status===400&&data.code==='VALIDATION_ERROR')await coordinator.reject(captured);
    const field=data.fields&&Object.values(data.fields)[0];
    throw new Error(field||data.error||'Não foi possível salvar o pedido. Seu carrinho foi mantido.');
  }
  if(!data.order?.id||!data.order?.pricing||!Array.isArray(data.order?.items))throw new Error('O servidor não confirmou a persistência do pedido. Seu carrinho foi mantido.');
  return data.order;
}
export async function completeCheckout({payload,persist=(body,options)=>persistCheckout(body,fetch,options),onConfirmed,onStaleConfirmed,coordinator=getCheckoutCoordinator(),revision=coordinator.snapshot().revision}) {
  const attempt=await coordinator.prepare(payload,revision);
  const order=await persist(attempt.payload,{coordinator,attempt,revision:attempt.revision});
  const result=await coordinator.finish(attempt,order,onConfirmed);
  if(!result.finalized)onStaleConfirmed?.(order);
  return order;
}
export async function recoverCheckoutAttempt(attempt,{coordinator=getCheckoutCoordinator(),fetchImpl=fetch}={}) {
  const order=await persistCheckout(attempt.payload,fetchImpl,{coordinator,attempt});
  // Recovery of an older attempt records its result without touching the active cart/UI.
  await coordinator.finish(attempt,order,async()=>{});
  await coordinator.markRecovered(attempt);
  return order;
}
