import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('dois contextos JS isolados coordenam envio, reload, compra independente e resposta atrasada',()=>{
 const output=execFileSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('./helpers/checkout-contexts.mjs',import.meta.url))],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const result=JSON.parse(output);assert.equal(result.passed,true);assert.equal(result.sameAttempt.distinctKeys,1);assert.equal(result.sameAttempt.persistedOrders,1);assert.equal(result.sameAttempt.externalEffectClaims,1);assert(result.independentIdenticalCarts.differentIDs);assert(result.staleResponse.currentCartPreserved);
});
