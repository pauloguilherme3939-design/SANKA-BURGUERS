import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutAttempt,pendingCheckoutPayload,persistCheckout,completeCheckout,recoverCheckoutAttempt } from '../lib/order-submit.mjs';
import { createCheckoutCoordinator,CHECKOUT_STATE_KEY,CART_STORAGE_KEY } from '../lib/checkout-coordinator.mjs';
import { fixture,payload,order,sharedStorage,webLocks,until } from './helpers/checkout-fixtures.mjs';
test('tentativa mantém chave após reload/falha e recusa conteúdo diferente',async()=>{
 const {storage,locks,coordinator,revision}=await fixture();const a=await checkoutAttempt(payload,coordinator,revision);
 const reloaded=createCheckoutCoordinator({storage,locks});await reloaded.initialize();const b=await checkoutAttempt(payload,reloaded,revision);
 assert.equal(a.key,b.key);assert.deepEqual(pendingCheckoutPayload(reloaded),payload);
 await assert.rejects(checkoutAttempt({...payload,payment:{method:'card'}},coordinator,revision),/pendente/);
 assert.equal((await checkoutAttempt(payload,coordinator,revision)).key,a.key);
});
test('resposta perdida mantém carrinho/chave e recupera mesmo ID antes de finalizar',async()=>{
 const {coordinator,revision}=await fixture();let cleared=false;const keys=[];let saved;
 const transport=async(_url,opts)=>{keys.push(opts.headers['Idempotency-Key']);saved||=order;if(keys.length===1)throw Error('lost response');return {ok:true,json:async()=>({order:saved})};};
 const persist=(p,options)=>persistCheckout(p,transport,options);
 await assert.rejects(completeCheckout({payload,coordinator,revision,persist,onConfirmed:()=>{cleared=true;}}));assert.equal(cleared,false);assert.equal(coordinator.snapshot().items.length,1);
 const a=coordinator.pendingAttempts()[0];await completeCheckout({payload,coordinator,revision,persist,onConfirmed:()=>{cleared=true;}});
 assert(cleared);assert.deepEqual(keys,[a.key,a.key]);assert.equal(coordinator.snapshot().items.length,0);
});
test('duas respostas da mesma tentativa só finalizam e disparam efeitos uma vez',async()=>{
 const {coordinator,revision}=await fixture();let callbacks=0,effects=0,release;const gate=new Promise(r=>release=r);
 const run=()=>completeCheckout({payload,coordinator,revision,persist:async()=>{await gate;return order;},onConfirmed:(_o,{allowExternalEffects})=>{callbacks++;if(allowExternalEffects)effects++;}});
 const a=run(),b=run();await until(()=>coordinator.pendingAttempts().length===1);release();await Promise.all([a,b]);assert.equal(callbacks,1);assert.equal(effects,1);
});
test('falha de rede e respostas inválidas preservam tentativas; sem armazenamento não envia',async()=>{
 const {coordinator,revision}=await fixture();let confirmed=false;
 for(const transport of [async()=>{throw Error('offline');},async()=>({ok:false,json:async()=>({error:'Falha'})}),async()=>({ok:true,json:async()=>({id:'incompleto'})})])await assert.rejects(completeCheckout({payload,coordinator,revision,persist:(p,o)=>persistCheckout(p,transport,o),onConfirmed:()=>{confirmed=true;}}));
 assert.equal(confirmed,false);assert.equal(coordinator.pendingAttempts().length,1);
 let sent=false;const broken=createCheckoutCoordinator({storage:null,locks:webLocks()});await assert.rejects(persistCheckout(payload,async()=>{sent=true;},{coordinator:broken,revision:null}));assert.equal(sent,false);
});
test('callback inconclusivo mantém recuperação e não repete efeitos',async()=>{
 const {coordinator,revision,storage}=await fixture();let effects=0;
 await assert.rejects(completeCheckout({payload,coordinator,revision,persist:async()=>order,onConfirmed:(_o,{allowExternalEffects})=>{if(allowExternalEffects)effects++;throw Error('callback failed');}}));
 const key=coordinator.pendingAttempts()[0].key;assert.equal(coordinator.snapshot().items.length,1);
 await completeCheckout({payload,coordinator,revision,persist:async()=>order,onConfirmed:(_o,{allowExternalEffects})=>{if(allowExternalEffects)effects++;}});assert.equal(effects,1);
 assert.equal(JSON.parse(storage.getItem(CHECKOUT_STATE_KEY)).attempts[key].status,'completed');
});
test('rejeição definitiva libera nova tentativa somente na revisão correspondente',async()=>{
 const {coordinator,revision}=await fixture();const first=await checkoutAttempt(payload,coordinator,revision);
 await assert.rejects(persistCheckout(payload,async()=>({ok:false,status:400,json:async()=>({code:'VALIDATION_ERROR',error:'inválido'})}),{coordinator,attempt:first}));
 assert.equal(coordinator.pendingAttempts().length,0);assert.equal(coordinator.snapshot().items.length,1);assert.notEqual((await checkoutAttempt({...payload,payment:{method:'card'}},coordinator,revision)).key,first.key);
});
test('resposta antiga não apaga chave nem carrinho de compra nova com itens idênticos',async()=>{
 const {coordinator,revision}=await fixture();let release,callbacks=0;
 const old=completeCheckout({payload,coordinator,revision,persist:()=>new Promise(r=>release=r),onConfirmed:()=>{callbacks++;}});await until(()=>release);
 const a=coordinator.pendingAttempts()[0];await coordinator.mutateCart(items=>items);const freshRev=coordinator.snapshot().revision;const b=await coordinator.prepare(payload,freshRev);
 assert.notEqual(a.key,b.key);release(order);await old;assert.equal(callbacks,0);assert.equal(coordinator.snapshot().revision,freshRev);assert.equal(coordinator.snapshot().items.length,1);
 assert(coordinator.pendingAttempts().some(x=>x.key===b.key));assert(coordinator.pendingAttempts().some(x=>x.key===a.key));
});
test('respostas inversas preservam terceira compra e recuperam pendentes antigos',async()=>{
 const {coordinator,revision}=await fixture();let releaseA,releaseB;const confirmations=[];
 const a=completeCheckout({payload,coordinator,revision,persist:()=>new Promise(r=>releaseA=r),onConfirmed:o=>confirmations.push(o.id)});await until(()=>releaseA);const attemptA=coordinator.pendingAttempts()[0];
 await coordinator.mutateCart(items=>items);const revB=coordinator.snapshot().revision;
 const b=completeCheckout({payload,coordinator,revision:revB,persist:()=>new Promise(r=>releaseB=r),onConfirmed:o=>confirmations.push(o.id)});await until(()=>releaseB);
 const second={...order,id:'SK-20261103-BBBBBBBBBBBBBBBB'};releaseB(second);await b;
 await coordinator.mutateCart(()=>payload.items);const revC=coordinator.snapshot().revision;const c=await coordinator.prepare(payload,revC);
 releaseA(order);await a;assert.deepEqual(confirmations,[second.id]);assert.equal(coordinator.snapshot().revision,revC);assert.equal(coordinator.snapshot().items.length,1);
 const recovered=await recoverCheckoutAttempt(attemptA,{coordinator,fetchImpl:async(_u,opts)=>{assert.equal(opts.headers['Idempotency-Key'],attemptA.key);return {ok:true,json:async()=>({order})};}});
 assert.equal(recovered.id,order.id);assert.equal(coordinator.snapshot().revision,revC);assert(coordinator.pendingAttempts().some(x=>x.key===c.key));
});
test('sem Web Locks bloqueia POST e mantém dados disponíveis para recuperação posterior',async()=>{
 const storage=sharedStorage();storage.setItem(CART_STORAGE_KEY,JSON.stringify(payload.items));const before=storage.getItem(CART_STORAGE_KEY);
 const noLocks=createCheckoutCoordinator({storage,locks:null});let sent=false;
 await assert.rejects(persistCheckout(payload,async()=>{sent=true;},{coordinator:noLocks,revision:null}),/coordenação segura/);assert.equal(sent,false);assert.equal(storage.getItem(CART_STORAGE_KEY),before);assert.equal(storage.getItem(CHECKOUT_STATE_KEY),null);
 const healthy=createCheckoutCoordinator({storage,locks:webLocks()});await healthy.initialize();assert.equal(healthy.snapshot().items.length,1);
});
test('tentativa v1 é migrada sob lock com a chave original; dados legados não são apagados',async()=>{
 const storage=sharedStorage(),locks=webLocks();storage.setItem(CART_STORAGE_KEY,JSON.stringify(payload.items));storage.setItem('sanka_checkout_attempt_v1',JSON.stringify({key:'old-stable-key-1234567890',fingerprint:JSON.stringify(payload)}));
 const a=createCheckoutCoordinator({storage,locks}),b=createCheckoutCoordinator({storage,locks});await Promise.all([a.initialize(),b.initialize()]);const refs=await Promise.all([a.prepare(payload,a.snapshot().revision),b.prepare(payload,b.snapshot().revision)]);assert.equal(refs[0].key,'old-stable-key-1234567890');assert.equal(refs[0].key,refs[1].key);assert(storage.getItem('sanka_checkout_attempt_v1'));
});
test('snapshot imutável impede mudança do conteúdo depois da requisição capturada',async()=>{
 const {coordinator,revision}=await fixture();const p=JSON.parse(JSON.stringify(payload)),attempt=await coordinator.prepare(p,revision);p.items[0].qty=9;assert.equal(attempt.payload.items[0].qty,1);assert.throws(()=>{attempt.payload.items[0].qty=9;},TypeError);
});

test('sem coordenação em tentativa já pendente preserva chave e permite recuperar ao restabelecer Web Locks',async()=>{
 const {coordinator,revision,storage,locks}=await fixture();const attempt=await coordinator.prepare(payload,revision);const before=storage.getItem(CHECKOUT_STATE_KEY);
 const unsupported=createCheckoutCoordinator({storage,locks:null});let sent=false;
 await assert.rejects(persistCheckout(payload,async()=>{sent=true;},{coordinator:unsupported,revision}),/coordenação segura/);assert.equal(sent,false);assert.equal(storage.getItem(CHECKOUT_STATE_KEY),before);
 const reloaded=createCheckoutCoordinator({storage,locks});await reloaded.initialize();assert.equal((await reloaded.prepare(payload,revision)).key,attempt.key);
});
test('finalização e edição concorrentes não limpam a compra que entra depois do lock',async()=>{
 const {coordinator,revision,storage}=await fixture();let release,entered=false,edited=false;
 const pending=completeCheckout({payload,coordinator,revision,persist:async()=>order,onConfirmed:()=>{entered=true;return new Promise(r=>release=r);}});await until(()=>entered);
 const changed=[{id:'SK-L01',qty:2,note:''}];const mutation=coordinator.mutateCart(()=>changed).then(()=>{edited=true;});await new Promise(r=>setImmediate(r));assert.equal(edited,false);
 release();await Promise.all([pending,mutation]);assert.deepEqual(coordinator.snapshot().items,changed);
 const state=JSON.parse(storage.getItem(CHECKOUT_STATE_KEY));const completed=Object.values(state.attempts)[0];assert.equal(completed.status,'completed');assert.equal(completed.payload,undefined);assert.match(completed.fingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(completed.order,{id:order.id});
});

test('conteúdo é capturado antes de aguardar o lock, sem acompanhar edição posterior do objeto',async()=>{
 const {coordinator,revision}=await fixture();const p=JSON.parse(JSON.stringify(payload));const preparing=coordinator.prepare(p,revision);p.customer.name='OUTRO CONTEUDO';p.items[0].qty=9;
 const attempt=await preparing;assert.equal(attempt.payload.customer.name,payload.customer.name);assert.equal(attempt.payload.items[0].qty,1);
});
