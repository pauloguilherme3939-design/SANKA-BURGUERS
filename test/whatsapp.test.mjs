import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildWhatsAppLink, safeWhatsAppLink, buildOrderWhatsAppMessage } from '../lib/whatsapp.mjs';
import { readContact } from '../lib/contact-sync.mjs';
const require=createRequire(import.meta.url),{validateAndPricePayload}=require('../lib/orders.js');
const number=readContact(new URL('../lib/brand.js',import.meta.url)).whatsapp;
const location={fullAddress:'Avenida 46, nº 250 – Jardim Primavera, Rio Claro — SP, CEP 13504-050',mapsUrl:'https://www.google.com/maps/dir/?api=1&destination=Sanka'};
function order(type='pickup',method='pix'){return validateAndPricePayload({customer:{name:'TESTE SINTÉTICO',phone:'19999990000'},items:[{id:'SK-L01',qty:1,note:'Observação sintética'}],fulfillment:{type,address:type==='delivery'?{cep:'00000000',street:'RUA SINTETICA',number:'1',neighborhood:'BAIRRO DE TESTE',reference:'NÃO ENTREGAR'}:null},payment:{method,change:'50'},origin:'teste_local'});}
test('link usa somente o destino central atual, sem homologá-lo, e codifica texto sem perder caracteres',()=>{
 assert.equal(number,'5516974069121');assert.equal(buildWhatsAppLink(number),'https://wa.me/'+number);
 const text='Olá! 🍔\nTeste & referência + # ? = 100%';const url=new URL(buildWhatsAppLink(number,text));
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/'+number);assert.equal(url.searchParams.get('text'),text);assert.equal([...url.searchParams.keys()].length,1);assert.equal(url.hash,'');
});
test('destinos inválidos não geram links nem injetam parâmetros',()=>{
 for(const n of ['',null,'(16) 97406-9121','5516974069121?text=erro','https://evil.invalid','5512'])assert.throws(()=>buildWhatsAppLink(n));
});
test('mensagem de retirada usa ID/preço persistidos, taxa zero, endereço da Sanka e mapa',()=>{
 const o=order('pickup','card'),m=buildOrderWhatsAppMessage(o,location),url=new URL(buildWhatsAppLink(number,m));
 assert.match(m,new RegExp(o.id));assert.match(m,/Retirada no local — sem taxa/);assert.match(m,/Cartão na retirada/);
 assert(m.includes(location.fullAddress));assert(m.includes(location.mapsUrl));assert.match(m,/TOTAL: R\$\s*37,90/);assert.doesNotMatch(m,/\*Endereço:\*/);assert.equal(url.searchParams.get('text'),m);
});
test('delivery não promete aceite nem taxa zero/total final e preserva bairro e referência',()=>{
 const o=order('delivery','card'),m=buildOrderWhatsAppMessage(o,location);
 assert.match(m,/Delivery — disponibilidade a confirmar/);assert.match(m,/Aguardando confirmação/);assert.match(m,/taxa a confirmar/);
 assert.match(m,/SUBTOTAL DOS ITENS/);assert.doesNotMatch(m,/\*TOTAL:|Entrega: Grátis/);assert.match(m,/BAIRRO DE TESTE/);assert.match(m,/NÃO ENTREGAR/);assert.match(m,/Cartão na entrega/);
});
test('checkout integrado usa construtor seguro central sem destino literal',()=>{
 for(const file of ['checkout-modal.jsx']){
  const src=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.match(src,/storeWhatsAppLink/);assert.doesNotMatch(src,/https:\/\/wa\.me\//);
 }
 const config=fs.readFileSync(new URL('../lib/config.js',import.meta.url),'utf8');assert.match(config,/safeWhatsAppLink\(SANKA_BRAND.whatsapp, message\)/);
});

test('contato ausente ou inválido não quebra renderização nem gera destino presumido',()=>{
 for(const value of ['',undefined,null,'55123','https://example.invalid/'])assert.equal(safeWhatsAppLink(value,'teste'),null);
 assert.equal(safeWhatsAppLink(number,'Olá'),buildWhatsAppLink(number,'Olá'));
});

test('endereço e telefone são normalizados pelo servidor e ficam somente no texto codificado do link',()=>{
 const o=validateAndPricePayload({customer:{name:'TESTE\nSINTÉTICO',phone:'(19) 99999-0000'},items:[{id:'SK-L01',qty:1,note:'<script>teste</script> & ?'}],fulfillment:{type:'delivery',address:{cep:'00000000',street:'RUA\nSINTÉTICA & ?',number:'1',neighborhood:'BAIRRO DE TESTE',reference:'<svg onload=teste>'}},payment:{method:'pix'}});
 assert.equal(o.customer.phone,'19999990000');assert(!o.customer.name.includes('\n'));assert(!o.fulfillment.address.street.includes('\n'));
 const text=buildOrderWhatsAppMessage(o,location),url=new URL(buildWhatsAppLink(number,text));assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/'+number);assert.equal(url.searchParams.get('text'),text);assert.equal([...url.searchParams.keys()].length,1);assert.equal(url.hash,'');
});
