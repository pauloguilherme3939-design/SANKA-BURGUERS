import test from 'node:test';
import assert from 'node:assert/strict';
import { completeCheckout, persistCheckout } from '../lib/order-submit.mjs';
import { fixture, payload, order } from './helpers/checkout-fixtures.mjs';

test('fechamento pelo servidor conserva carrinho e tentativa; reabertura reutiliza a mesma chave',async()=>{
 const {coordinator,revision}=await fixture();const keys=[];let closed=true,confirmed=0;
 const fetchImpl=async(_url,options)=>{keys.push(options.headers['Idempotency-Key']);return closed?{ok:false,status:409,json:async()=>({code:'STORE_CLOSED',error:'Loja fechada. Seu carrinho foi mantido.'})}:{ok:true,status:201,json:async()=>({order})};};
 const send=()=>completeCheckout({payload,coordinator,revision,persist:(body,options)=>persistCheckout(body,fetchImpl,options),onConfirmed:()=>{confirmed++;}});
 await assert.rejects(send(),/fechada/);assert.equal(coordinator.snapshot().items.length,1);assert.equal(coordinator.pendingAttempts().length,1);assert.equal(confirmed,0);
 closed=false;await send();assert.equal(keys[0],keys[1]);assert.equal(confirmed,1);assert.equal(coordinator.snapshot().items.length,0);
});
