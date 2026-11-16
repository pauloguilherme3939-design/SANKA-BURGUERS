'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateAndPricePayload,createOrderService,OrderError,orderRules}=require('../lib/orders.js');

function payload(type='pickup') {
  return {customer:{name:'TESTE MODALIDADE',phone:'19999990000'},items:[{id:'SK-L01',qty:1,price:0.01}],
    fulfillment:{type,address:type==='delivery'?{cep:'00000000',street:'Rua de Teste',number:'1',neighborhood:'Bairro de Teste'}:null},
    payment:{method:'pix',change:''},couponCode:'',total:0.01};
}
test('retirada dispensa endereço residencial e mantém taxa zero e preço do catálogo',()=>{
  const p=payload();p.fulfillment.address={neighborhood:'',cep:'inválido'};
  const o=validateAndPricePayload(p);
  assert.equal(o.fulfillment.address,null);
  assert.equal(o.pricing.deliveryFee,0);
  assert.equal(o.pricing.total,37.9);
  assert.equal(o.pricing.totalIsFinal,true);
  assert.equal(o.status,'recebido');
});
test('delivery exige bairro mesmo em requisição direta e não cria pedido inválido',async()=>{
  let persisted=false;
  const p=payload('delivery');p.fulfillment.address.neighborhood='';
  const service=createOrderService({ businessHours: { enforce: false },store:{async create(){persisted=true;}}});
  await assert.rejects(service.create(p),e=>e instanceof OrderError&&Boolean(e.fields?.neighborhood));
  assert.equal(persisted,false);
});
test('delivery manual preserva taxa desconhecida, disponibilidade pendente e total provisório',()=>{
  const o=validateAndPricePayload(payload('delivery'));
  assert.equal(orderRules.deliveryAvailabilityStatus,'confirm_on_whatsapp');
  assert.equal(o.pricing.deliveryFee,null);
  assert.equal(o.pricing.availabilityPending,true);
  assert.equal(o.pricing.totalIsFinal,false);
  assert.deepEqual(o.pricing.pendingReasons,['delivery_fee','availability']);
  assert.equal(o.pricing.total,37.9);
  assert.equal(o.status,'recebido');
});
test('referência de entrega é opcional, normalizada e limitada sem exigir dado para retirada',()=>{
  const p=payload('delivery');p.fulfillment.address.reference='  Portão azul\n'+ 'x'.repeat(200);
  const o=validateAndPricePayload(p);
  assert.ok(o.fulfillment.address.reference.startsWith('Portão azul '));
  assert.equal(o.fulfillment.address.reference.length,160);
  assert.equal(validateAndPricePayload(payload('delivery')).fulfillment.address.reference,'');
  assert.equal(validateAndPricePayload(payload()).fulfillment.address,null);
});
test('modalidade não configurada é rejeitada e não altera regras de preço ou cupom',()=>{
  assert.deepEqual(orderRules.fulfillmentTypes,['pickup','delivery']);
  const p=payload();p.fulfillment.type='agendamento';
  assert.throws(()=>validateAndPricePayload(p),e=>Boolean(e.fields?.fulfillment));
  assert.equal(orderRules.deliveryFee,null);
  assert.equal(orderRules.freeDeliveryAbove,null);
  assert.deepEqual(orderRules.coupons,{});
});
test('persistência de ambas as modalidades confirma somente após gravar',async()=>{
  for(const type of ['pickup','delivery']){
    let release,stored;
    const service=createOrderService({ businessHours: { enforce: false },store:{create:order=>new Promise(r=>{stored=order;release=r;})}});
    let resolved=false;
    const pending=service.create(payload(type)).then(o=>{resolved=true;return o;});
    await new Promise(r=>setImmediate(r));
    assert.equal(resolved,false);
    assert.equal(stored.fulfillment.type,type);
    release();const o=await pending;assert.equal(o.id,stored.id);
  }
});
