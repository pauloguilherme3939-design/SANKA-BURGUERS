'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createOrderService,validateAndPricePayload}=require('../lib/orders.js');
const {FileOrderStore}=require('../lib/order-store.js');
const {createOrderHandler}=require('../api/pedido.js');
async function fixture(t,status,extra={}){
 const rootDir=await fs.mkdtemp(path.join(os.tmpdir(),'sanka-p05-legacy-'));
 t.after(async()=>{assert(path.resolve(rootDir).startsWith(path.resolve(os.tmpdir())+path.sep+'sanka-p05-legacy-'));await fs.rm(rootDir,{recursive:true,force:true});});
 const store=new FileOrderStore({rootDir});let tick=0;
 const now=()=>new Date(Date.parse('2026-11-11T19:00:00-03:00')+tick++*10);
 const order=validateAndPricePayload({customer:{name:'TESTE LEGADO SINTETICO',phone:'19999990000'},items:[{id:'SK-L01',qty:1}],fulfillment:{type:'delivery',address:{cep:'00000000',street:'RUA SINTETICA',number:'1',neighborhood:'BAIRRO SINTETICO'}},payment:{method:'pix'}},{now:now()});
 Object.assign(order,{status,...extra});order.history.push({status,ts:now().toISOString()});await store.create(order);
 const service=createOrderService({store,now});
 const call=async(body,auth=true)=>{const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){}};await createOrderHandler({service,adminPassword:'synthetic-admin'})({method:'PATCH',query:{id:order.id},body,headers:auth?{authorization:'Bearer synthetic-admin'}:{}},res);return res;};
 return {store,service,order,call};
}
const confirmation={areaConfirmed:true,customerAccepted:true,deliveryFeeCents:500,totalCents:4290};
for(const status of ['recebido','preparando','na_chapa','finalizando','saiu_entrega'])test('legado '+status+': exige admin e aceite explícito, mantém estado e histórico',async t=>{
 const f=await fixture(t,status),before=await f.store.get(f.order.id);
 await assert.rejects(f.service.updateStatus(f.order.id,'entregue'),e=>e.code==='DELIVERY_CONFIRMATION_PENDING');
 assert.equal((await f.call({action:'confirm_delivery',confirmation},false)).statusCode,401);
 for(const invalid of [{...confirmation,areaConfirmed:false},{...confirmation,customerAccepted:false},{...confirmation,totalCents:1},{...confirmation,deliveryFeeCents:-1}])assert.equal((await f.call({action:'confirm_delivery',confirmation:invalid})).statusCode,400);
 assert.equal((await f.store.get(f.order.id)).commercialConfirmation,undefined);
 const response=await f.call({action:'confirm_delivery',confirmation});assert.equal(response.statusCode,200);assert.equal(response.body.status,status);assert.deepEqual(response.body.history,before.history);assert.equal(response.body.commercialConfirmation.actor,'authenticated_admin');
 assert.equal((await f.call({action:'confirm_delivery',confirmation})).statusCode,200);
 assert.equal((await f.store.get(f.order.id)).commercialConfirmation.deliveryFeeCents,500);
 const next=['recebido','preparando','na_chapa','finalizando','saiu_entrega','entregue'];assert.equal((await f.service.updateStatus(f.order.id,next[next.indexOf(status)+1])).status,next[next.indexOf(status)+1]);
});
for(const [status,extra] of [['entregue',{}],['cancelado',{}],['desconhecido',{}],['preparando',{archived:true}]])test('confirmação não altera legado terminal/arquivado/inválido: '+status+JSON.stringify(extra),async t=>{
 const f=await fixture(t,status,extra),before=await f.store.get(f.order.id);assert.equal((await f.call({action:'confirm_delivery',confirmation})).statusCode,409);assert.deepEqual(await f.store.get(f.order.id),before);
});
