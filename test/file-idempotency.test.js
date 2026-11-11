'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {FileOrderStore}=require('../lib/order-store.js');const {createOrderService}=require('../lib/orders.js');
test('fallback local persiste associação de tentativa e suporta concorrência e nova instância',async t=>{
 const rootDir=await fs.mkdtemp(path.join(os.tmpdir(),'sanka-p0-key-'));t.after(()=>fs.rm(rootDir,{recursive:true,force:true}));
 const make=()=>createOrderService({ businessHours: { enforce: false },store:new FileOrderStore({rootDir})});
 const payload={customer:{name:'TESTE',phone:'19999990000'},items:[{id:'SK-L01',qty:1}],fulfillment:{type:'pickup'},payment:{method:'pix'}};
 const key='local-file-test-1234567890';const orders=await Promise.all(Array.from({length:12},()=>make().create(payload,{idempotencyKey:key})));
 assert.equal(new Set(orders.map(x=>x.id)).size,1);const original=orders[0];assert.equal((await make().list(original.day)).length,1);
 await make().updateStatus(original.id,'preparando');assert.deepEqual(await make().create(payload,{idempotencyKey:key}),original);
 await assert.rejects(make().create({...payload,payment:{method:'card'}},{idempotencyKey:key}),e=>e.code==='IDEMPOTENCY_CONFLICT');
});
