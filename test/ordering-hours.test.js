'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {BUSINESS_HOURS,isOpenAt,orderingState,validateHours}=require('../lib/business-hours.js');
const {createOrderService}=require('../lib/orders.js');
const {FileOrderStore}=require('../lib/order-store.js');
const {createOrderHandler}=require('../api/pedido.js');
const active=()=>({...structuredClone(BUSINESS_HOURS),approved:true,enforce:true});
const at=value=>new Date(value+'-03:00');
const payload=(type='pickup')=>({customer:{name:'TESTE SINTETICO HORARIO',phone:'19999990000'},items:[{id:'SK-L01',qty:1}],
  fulfillment:{type,address:type==='delivery'?{cep:'00000000',street:'RUA DE TESTE',number:'1',neighborhood:'BAIRRO SINTETICO'}:null},payment:{method:'pix'}});
const key='synthetic-hours-attempt-123456789';
function recorder(){return {statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;},end(){}};}
async function fixture(t){const rootDir=await fs.mkdtemp(path.join(os.tmpdir(),'sanka-hours-'));t.after(()=>fs.rm(rootDir,{recursive:true,force:true}));const store=new FileOrderStore({rootDir});let current=at('2026-11-04T20:00:00');const config=active();return {store,config,setNow:value=>{current=at(value);},service:createOrderService({store,now:()=>{const value=new Date(current);current=new Date(current.getTime()+1);return value;},businessHours:config})};}

test('abertura inclusiva e fechamento exclusivo na grade existente',()=>{
 for(const [time,expected] of [['18:29:59',false],['18:30:00',true],['23:29:59',true],['23:30:00',false]])assert.equal(isOpenAt(at('2026-11-04T'+time),active()),expected,time);
});
test('sexta/sábado encerram exatamente à meia-noite, sem abertura indevida do próximo dia',()=>{
 for(const [date,expected] of [['2026-11-06T23:59:59',true],['2026-11-07T00:00:00',false],['2026-11-07T18:30:00',true],['2026-11-07T23:59:59',true],['2026-11-08T00:00:00',false]])assert.equal(isOpenAt(at(date),active()),expected,date);
});
test('segunda e terça fechadas, inclusive antes/depois da virada de dia',()=>{
 for(const date of ['2026-11-08T23:30:00','2026-11-09T00:00:00','2026-11-09T20:00:00','2026-11-10T23:59:59','2026-11-11T00:00:00'])assert.equal(isOpenAt(at(date),active()),false,date);
});
test('fuso de São Paulo independe do offset do cliente e da data UTC',()=>{
 assert.equal(isOpenAt(new Date('2026-11-05T02:29:59Z'),active()),true);
 assert.equal(isOpenAt(new Date('2026-11-05T02:30:00Z'),active()),false);
 assert.equal(isOpenAt(new Date('2026-11-04T16:30:00-05:00'),active()),true);
});
test('grade sintética noturna cruza meia-noite e semana, sem transformar dia fechado em dia aberto inteiro',()=>{
 const config=active();config.week[0]=[{opens:'20:00',closes:'02:00'}];
 assert.equal(isOpenAt(at('2026-11-09T01:59:59'),config),true);
 assert.equal(isOpenAt(at('2026-11-09T02:00:00'),config),false);
 assert.equal(isOpenAt(at('2026-11-09T20:00:00'),config),false);
});
test('abertura sintética às 00h e dia totalmente fechado têm semânticas distintas',()=>{
 const config=active();config.week[3]=[{opens:'00:00',closes:'01:00'}];
 assert.equal(isOpenAt(at('2026-11-04T00:00:00'),config),true);
 assert.equal(isOpenAt(at('2026-11-04T01:00:00'),config),false);
});
test('grade aprovada bloqueia segunda-feira e ativação sem aprovação falha conservadoramente',()=>{
 assert.deepEqual(orderingState(at('2026-11-09T20:00:00')), {allowed:false,reason:'schedule'});
 assert.deepEqual(orderingState(at('2026-11-04T20:00:00'),{...active(),approved:false}),{allowed:false,reason:'not_approved'});
});
test('configuração inválida, intervalo ambíguo ou sobreposto bloqueiam ativação',()=>{
 const configs=[{...active(),timeZone:'UTC'}, {...active(),week:{}}];
 for(const slot of [{opens:'24:00',closes:'01:00'},{opens:'18:30',closes:'18:30'},null]){const c=active();c.week[3]=[slot];configs.push(c);}
 const overlap=active();overlap.week[3]=[{opens:'20:00',closes:'02:00'}];overlap.week[4]=[{opens:'01:00',closes:'03:00'}];configs.push(overlap);
 for(const config of configs){assert.throws(()=>validateHours(config));assert.equal(orderingState(new Date(),config).allowed,false);}
 assert.throws(()=>isOpenAt(new Date('invalid'),active()));
});
test('API bloqueia POST direto de retirada/delivery fechado sem gravar e sem aceitar liberação do cliente',async t=>{
 const f=await fixture(t);f.setNow('2026-11-09T20:00:00');const handler=createOrderHandler({service:f.service});
 for(const type of ['pickup','delivery']){const res=recorder();await handler({method:'POST',headers:{'idempotency-key':key},body:{...payload(type),businessHours:{enforce:false},isOpen:true}},res);assert.equal(res.statusCode,409);assert.equal(res.body.code,'STORE_CLOSED');}
 assert.equal((await f.store.list('2026-11-09')).length,0);
});
test('servidor não aceita ativação comercial ainda não aprovada',async t=>{
 const f=await fixture(t);f.config.approved=false;
 await assert.rejects(f.service.create(payload(),{idempotencyKey:key}),e=>e.status===503&&e.code==='BUSINESS_HOURS_UNAVAILABLE');
 assert.equal((await f.store.list('2026-11-04')).length,0);
});
test('reenvio de pedido persistido antes do fechamento recupera o ID após reiniciar o serviço; divergência continua409',async t=>{
 const f=await fixture(t),original=await f.service.create(payload(),{idempotencyKey:key});f.setNow('2026-11-04T23:30:00');
 const restarted=createOrderService({store:f.store,now:()=>at('2026-11-04T23:30:00'),businessHours:active()});
 assert.equal((await restarted.create(payload(),{idempotencyKey:key})).id,original.id);
 await assert.rejects(restarted.create({...payload(),payment:{method:'card'}},{idempotencyKey:key}),e=>e.code==='IDEMPOTENCY_CONFLICT');
 await assert.rejects(restarted.create(payload(),{idempotencyKey:key+'new'}),e=>e.code==='STORE_CLOSED');
 assert.equal((await f.store.list('2026-11-04')).length,1);
});
test('consultas/administração legítimas continuam depois de fechar, com autenticação e histórico preservados',async t=>{
 const f=await fixture(t),o=await f.service.create(payload(),{idempotencyKey:key}),delivery=await f.service.create(payload('delivery'),{idempotencyKey:key+'delivery'});
 f.setNow('2026-11-04T23:30:00');const handler=createOrderHandler({service:f.service,adminPassword:'synthetic-test-password'});
 const patch=async(id,body,auth=true)=>{const res=recorder();await handler({method:'PATCH',query:{id},headers:auth?{authorization:'Bearer synthetic-test-password'}:{},body},res);return res;};
 assert.equal((await patch(o.id,{status:'preparando'},false)).statusCode,401);
 assert.equal((await patch(delivery.id,{status:'preparando'})).statusCode,409);
 assert.equal((await patch(delivery.id,{action:'confirm_delivery',confirmation:{areaConfirmed:true,customerAccepted:true,deliveryFeeCents:100,totalCents:3890}})).statusCode,200);
 assert.equal((await patch(delivery.id,{status:'preparando'})).statusCode,200);
 for(const status of ['preparando','na_chapa','finalizando','saiu_entrega','entregue'])assert.equal((await patch(o.id,{status})).statusCode,200);
 assert.equal((await patch(o.id,{action:'archive'})).statusCode,200);assert.equal((await patch(o.id,{action:'restore'})).statusCode,200);
 assert.equal((await patch(delivery.id,{action:'cancel'})).statusCode,200);
 assert.equal((await f.service.getPublic(o.id)).status,'entregue');assert.equal((await f.service.list('2026-11-04')).length,2);
 assert.deepEqual((await f.store.get(o.id)).administrativeHistory.map(e=>e.kind),['archived','restored']);
});
