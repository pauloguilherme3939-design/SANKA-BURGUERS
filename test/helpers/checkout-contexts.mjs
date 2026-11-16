import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { sharedStorage, webLocks, payload, order, until } from './checkout-fixtures.mjs';
const code=fs.readFileSync(new URL('../../lib/checkout-coordinator.mjs',import.meta.url),'utf8');
const submitCode=fs.readFileSync(new URL('../../lib/order-submit.mjs',import.meta.url),'utf8');
const storage=sharedStorage(),locks=webLocks();
storage.setItem('sanka_cart_launch_2026',JSON.stringify(payload.items));
async function tab(name) {
 const context=vm.createContext({crypto:{randomUUID:()=>crypto.randomUUID(),subtle:crypto.webcrypto.subtle},TextEncoder,console});
 const module=new vm.SourceTextModule(code,{context,identifier:name+'-coordinator'});await module.link(()=>{throw Error('unexpected import');});await module.evaluate();
 const submit=new vm.SourceTextModule(submitCode,{context,identifier:name+'-submit'});await submit.link(()=>module);await submit.evaluate();
 const coordinator=module.namespace.createCheckoutCoordinator({storage:{getItem:k=>storage.getItem(k),setItem:(k,v)=>storage.setItem(k,v),removeItem:k=>storage.removeItem(k)},locks:{request:(...args)=>locks.request(...args)}});
 await coordinator.initialize();return {coordinator,submit:submit.namespace};
}
const a=await tab('tab-A'),b=await tab('tab-B'),revision=a.coordinator.snapshot().revision;
const database=new Map(),keys=[];
const transport=async(_u,options)=>{
 const key=options.headers['Idempotency-Key'],body=JSON.parse(options.body);keys.push(key);
 const fingerprint=JSON.stringify(body);const previous=database.get(key);
 if(previous&&previous.fingerprint!==fingerprint)return {ok:false,status:409,json:async()=>({error:'conflict'})};
 if(!previous)database.set(key,{fingerprint,order:{...order,id:'SK-20261103-'+String(database.size+1).padStart(16,'0')}});
 return {ok:true,json:async()=>({order:database.get(key).order})};
};
let callbacks=0,effects=0;
const persist=(tab,delay)=>async(p,options)=>{const result=await tab.submit.persistCheckout(p,transport,options);if(delay)await delay;return result;};
let release;const gate=new Promise(r=>release=r);
const run=tab=>tab.submit.completeCheckout({payload,coordinator:tab.coordinator,revision,persist:persist(tab,gate),onConfirmed:(_o,{allowExternalEffects})=>{callbacks++;if(allowExternalEffects)effects++;}});
const first=run(a),second=run(b);await until(()=>keys.length===2);assert.equal(new Set(keys).size,1);assert.equal(database.size,1);release();const completed=await Promise.all([first,second]);assert.equal(completed[0].id,completed[1].id);assert.equal(callbacks,1);assert.equal(effects,1);
const sameAttempt={isolatedContexts:2,requests:keys.length,distinctKeys:new Set(keys).size,persistedOrders:database.size,confirmationCallbacks:callbacks,externalEffectClaims:effects};
// A genuinely new cart revision may contain exactly the same products.
await a.coordinator.mutateCart(()=>payload.items);const rev2=a.coordinator.snapshot().revision;
const independent=await b.submit.completeCheckout({payload,coordinator:b.coordinator,revision:rev2,persist:persist(b),onConfirmed:()=>{}});assert.notEqual(independent.id,completed[0].id);assert.equal(database.size,2);
// Both contexts reload while a third attempt is pending, then recover a lost response.
await a.coordinator.mutateCart(()=>payload.items);const rev3=a.coordinator.snapshot().revision;
let lostKey;await assert.rejects(a.submit.completeCheckout({payload,coordinator:a.coordinator,revision:rev3,persist:async(p,o)=>{lostKey=o.attempt.key;await a.submit.persistCheckout(p,transport,o);throw Error('lost response after commit');},onConfirmed:()=>{throw Error('must not confirm');}}));
const reloadedA=await tab('tab-A-reloaded'),reloadedB=await tab('tab-B-reloaded');
const recoveredRefs=await Promise.all([reloadedA.coordinator.prepare(payload,rev3),reloadedB.coordinator.prepare(payload,rev3)]);assert.equal(recoveredRefs[0].key,lostKey);assert.equal(recoveredRefs[1].key,lostKey);
const recovered=await Promise.all([reloadedA.submit.completeCheckout({payload,coordinator:reloadedA.coordinator,revision:rev3,persist:persist(reloadedA),onConfirmed:()=>{}}),reloadedB.submit.completeCheckout({payload,coordinator:reloadedB.coordinator,revision:rev3,persist:persist(reloadedB),onConfirmed:()=>{}})]);assert.equal(recovered[0].id,recovered[1].id);assert.equal(database.size,3);
// An older response arrives only after another logical purchase has been started.
await a.coordinator.mutateCart(()=>payload.items);const rev4=a.coordinator.snapshot().revision;let releaseOld,oldUI=0;
const old=a.submit.completeCheckout({payload,coordinator:a.coordinator,revision:rev4,persist:async(p,o)=>{const result=await a.submit.persistCheckout(p,transport,o);return new Promise(r=>releaseOld=()=>r(result));},onConfirmed:()=>{oldUI++;}});await until(()=>releaseOld);
await b.coordinator.mutateCart(()=>payload.items);const rev5=b.coordinator.snapshot().revision;const newAttempt=await b.coordinator.prepare(payload,rev5);releaseOld();await old;
assert.equal(oldUI,0);assert.equal(a.coordinator.snapshot().revision,rev5);assert.equal(a.coordinator.snapshot().items.length,1);assert(a.coordinator.pendingAttempts().some(x=>x.key===newAttempt.key));assert(a.coordinator.pendingAttempts().some(x=>x.revision===rev4));
console.log(JSON.stringify({passed:true,realBrowser:false,contexts:'separate Node vm realms with a shared storage/lock service',sameAttempt,independentIdenticalCarts:{differentIDs:true,ordersAfterTwoPurchases:2},reloadRecovery:{reloadedContexts:2,sameKey:true,sameID:true,ordersAfterRecovery:3},staleResponse:{newAttemptPreserved:true,currentCartPreserved:true,oldUIInvocations:oldUI,olderAttemptRetained:true}}));
