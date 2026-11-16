import assert from 'node:assert/strict';
import test from 'node:test';
import { completeCheckout,persistCheckout } from '../lib/order-submit.mjs';
import { fixture,payload,order,until } from './helpers/checkout-fixtures.mjs';

test('caminho padrão envia POST com a tentativa capturada e só limpa após confirmação',async t=>{
 const {coordinator,revision}=await fixture();let release,request;const events=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  request={url,options};return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({order})});});
 });
 const pending=completeCheckout({payload,coordinator,revision,onConfirmed:o=>events.push(o.id)});
 await until(()=>release);
 const attempt=coordinator.pendingAttempts()[0];
 assert.equal(request.url,'/api/pedido');assert.equal(request.options.method,'POST');
 assert.equal(request.options.headers['Idempotency-Key'],attempt.key);
 assert.deepEqual(JSON.parse(request.options.body),payload);
 assert.equal(attempt.revision,revision);assert.equal(coordinator.snapshot().items.length,1);assert.deepEqual(events,[]);
 release();await pending;
 assert.deepEqual(events,[order.id]);assert.equal(coordinator.snapshot().items.length,0);assert.equal(coordinator.pendingAttempts().length,0);
});

test('falha no envio padrão conserva a chave e a recuperação reutiliza a tentativa',async t=>{
 const {coordinator,revision}=await fixture();const keys=[];let failed=true,confirmations=0;
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  keys.push(options.headers['Idempotency-Key']);
  if(failed)throw Error('falha sintética de conexão');
  return {ok:true,json:async()=>({order})};
 });
 const send=()=>completeCheckout({payload,coordinator,revision,onConfirmed:()=>{confirmations++;}});
 await assert.rejects(send(),/Não foi possível conectar/);
 assert.equal(confirmations,0);assert.equal(coordinator.snapshot().items.length,1);assert.equal(coordinator.pendingAttempts().length,1);
 failed=false;await send();
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.equal(confirmations,1);assert.equal(coordinator.snapshot().items.length,0);
});
test('ações destrutivas ficam bloqueadas até a persistência confirmar',async()=>{
 const {coordinator,revision}=await fixture();let release;const events=[];
 const pending=completeCheckout({payload,coordinator,revision,persist:()=>new Promise(r=>release=r),onConfirmed:o=>events.push(o.id)});
 await until(()=>release);assert.deepEqual(events,[]);assert.equal(coordinator.snapshot().items.length,1);
 release(order);await pending;assert.deepEqual(events,[order.id]);assert.equal(coordinator.snapshot().items.length,0);
});
test('falha de persistência não executa nenhuma ação de confirmação',async()=>{
 const {coordinator,revision}=await fixture();let confirmed=false;
 await assert.rejects(completeCheckout({payload,coordinator,revision,persist:async()=>{throw Error('Falha controlada');},onConfirmed:()=>{confirmed=true;}}),/Falha controlada/);
 assert.equal(confirmed,false);assert.equal(coordinator.snapshot().items.length,1);assert.equal(coordinator.pendingAttempts().length,1);
});
test('cliente transforma falha HTTP e resposta inválida em mensagem visível',async()=>{
 const {coordinator,revision}=await fixture();
 await assert.rejects(persistCheckout(payload,async()=>({ok:false,json:async()=>({error:'Servidor indisponível.'})}),{coordinator,revision}),/Servidor indisponível/);
 await assert.rejects(persistCheckout(payload,async()=>({ok:true,json:async()=>({id:'sem-order'})}),{coordinator,revision}),/não confirmou/i);
});
