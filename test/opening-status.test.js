'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createOpeningHoursHandler}=require('../api/funcionamento.js');
const {BUSINESS_HOURS}=require('../lib/business-hours.js');
const at=value=>new Date(value+'-03:00');
const synthetic=()=>({approved:true,enforce:true,timeZone:'America/Sao_Paulo',week:Object.fromEntries([0,1,2,3,4,5,6].map(day=>[day,[{opens:'19:00',closes:'21:00'}]]))});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){this.ended=true;return this;}};}

test('endpoint público não divulga grade pendente nem dados de clientes',()=>{
 const res=response();createOpeningHoursHandler({config:{...BUSINESS_HOURS,approved:false,enforce:false},now:()=>at('2026-11-04T20:00:00')})({method:'GET',query:{isOpen:true}},res);
 assert.equal(res.body.state,'pending');assert.equal(res.body.enforced,false);
 assert.equal(res.body.timeZone,'America/Sao_Paulo');assert.equal(res.headers['Cache-Control'],'no-store');
 assert.deepEqual(Object.keys(res.body).sort(),['checkedAt','enforced','message','state','timeZone']);assert.match(res.body.message,/confirmação/);
});
test('aviso aberto/fechado usa hora do servidor e grade exclusivamente sintética',()=>{
 const config=synthetic();let instant=at('2026-11-04T18:59:59');const handler=createOpeningHoursHandler({config,now:()=>instant});
 for(const [time,state] of [['18:59:59','closed'],['19:00:00','open'],['20:59:59','open'],['21:00:00','closed']]){instant=at('2026-11-04T'+time);const res=response();handler({method:'GET',query:{isOpen:state==='closed'}},res);assert.equal(res.body.state,state,time);assert.equal(res.body.enforced,true);}
});
test('configuração ativada sem aprovação ou inválida jamais anuncia loja aberta',()=>{
 for(const config of [{...synthetic(),approved:false},{...synthetic(),timeZone:'UTC'}]){const res=response();createOpeningHoursHandler({config,now:()=>at('2026-11-04T20:00:00')})({method:'GET'},res);assert.equal(res.body.state,'unavailable');}
});
test('endpoint de funcionamento é somente leitura, com HEAD/OPTIONS e POST rejeitado',()=>{
 const handler=createOpeningHoursHandler();for(const [method,status] of [['HEAD',200],['OPTIONS',204],['POST',405],['PATCH',405],['DELETE',405]]){const res=response();handler({method,body:{enforce:true}},res);assert.equal(res.statusCode,status);}
 const cached=Object.keys(require.cache);assert(!cached.some(n=>/[\\/]lib[\\/](?:order-store|postgres-database)\.js$/.test(n)));
});
