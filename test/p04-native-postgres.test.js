'use strict';
// Explicit opt-in. Uses only an empty disposable cluster on loopback, never DATABASE_URL.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFile}=require('node:child_process');
if(!process.env.P04_LOCAL_PSQL){test('PostgreSQL nativo descartável (opt-in P04_LOCAL_PSQL)',{skip:true},()=>{});}else{
 const root=path.resolve(__dirname,'..');
 const {PostgresOrderStore}=require('../lib/order-store.js');
 const {createOrderService}=require('../lib/orders.js');
 const {createOrderHandler}=require('../api/pedido.js');
 const secret='P04-SYNTHETIC-ONLY-NOT-USED-IN-ANY-NEON-ENVIRONMENT';
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP'].includes(k)));
 const database=process.env.P04_LOCAL_DATABASE||'postgres';
 assert(/^(?:postgres|sanka_p04_[a-z0-9_]+)$/.test(database));
 const args=['-X','-w','-h','127.0.0.1','-p','55484','-U','sanka_p04','-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-At'];
 const run=sql=>new Promise((resolve,reject)=>{execFile(process.env.P04_LOCAL_PSQL,[...args,'-c',sql],{env,windowsHide:true,timeout:30000,maxBuffer:1024*1024},(e,out,err)=>{if(e){const failure=Error(err||e.message);failure.code=/ERROR:\s+([0-9A-Z]{5}):/.exec(err)?.[1];failure.constraint=/CONSTRAINT NAME:\s+([^\r\n]+)/.exec(err)?.[1]?.trim() || /unique constraint "([^"]+)"/.exec(err)?.[1];reject(failure);}else resolve(out.trim());});});
 const quote=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
 const bind=(sql,p=[])=>sql.replace(/\$(\d+)/g,(_,n)=>quote(p[Number(n)-1]));
 const query=async(sql,p=[])=>{
   const q=bind(sql,p),insert=/^\s*(?:\/\*[\s\S]*?\*\/\s*)?INSERT/i.test(q);
   if(insert&&!/\bRETURNING\b/i.test(q)){await run(q);return [];}
   const statement=insert?`WITH result AS (${q}) SELECT COALESCE(json_agg(result),'[]'::json) FROM result`:`SELECT COALESCE(json_agg(result),'[]'::json) FROM (${q}) result`;
   return JSON.parse(await run(statement));
 };
 let current=new Date('2026-11-11T19:00:00-03:00');
 const store=()=>new PostgresOrderStore({database:{query},secret});
 const service=()=>createOrderService({store:store(),now:()=>new Date(current)});
 const payload=(type='pickup')=>({customer:{name:'TESTE SINTETICO P04',phone:'19999990000'},items:[{id:'SK-L01',qty:1}],fulfillment:{type,address:type==='delivery'?{cep:'00000000',street:'RUA SINTETICA',number:'1',neighborhood:'BAIRRO DE TESTE'}:null},payment:{method:'pix'}});
 const call=async(method,body,key,queryParams={},auth=false,s=service())=>{
   const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){}};
   await createOrderHandler({service:s,adminPassword:'synthetic-admin',cancelBenefits:async()=>({cancelledCount:0})})({method,body,query:queryParams,headers:{...(key?{'idempotency-key':key}:{}),...(auth?{authorization:'Bearer synthetic-admin'}:{})}},res);return res;
 };
 let original,key;
 test('nativo: schema vazio, 001/002/003 manuais somente no cluster local',async()=>{
   assert.equal((await query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'"))[0].n,0,'Requer banco local vazio; não remove dados existentes.');
   const migration=require('../migrations/001-neon-core.js');
   await run('BEGIN; CREATE TABLE sanka_schema_migrations(id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());'+migration.statements.join(';')+"; INSERT INTO sanka_schema_migrations(id) VALUES ('001_neon_core');COMMIT;");
   for(const name of ['002-order-archive.sql','003-order-confirmation-idempotency.sql'])await run(fs.readFileSync(path.join(root,'migrations/manual',name),'utf8'));
   assert.equal((await query('SELECT count(*)::int n FROM sanka_schema_migrations'))[0].n,3);
 });
 test('nativo: 20 conexões independentes simultâneas, uma linha, retry, conflito e compra independente',async()=>{
   key=crypto.randomUUID();const responses=await Promise.all(Array.from({length:20},()=>call('POST',payload(),key)));
   assert(responses.every(r=>r.statusCode===201));assert.equal(new Set(responses.map(r=>r.body.id)).size,1);
   original=responses[0].body.id;assert.equal((await query('SELECT count(*)::int n FROM sanka_orders'))[0].n,1);
   assert.equal((await call('POST',payload(),key)).body.id,original);
   assert.equal((await call('POST',{...payload(),payment:{method:'card'}},key)).statusCode,409);
   assert.notEqual((await call('POST',payload(),crypto.randomUUID())).body.id,original);
   assert.equal((await query('SELECT count(*)::int n FROM sanka_orders'))[0].n,2);
 });
 test('nativo: perda de resposta após commit e falha antes de gravar preservam recuperação',async()=>{
   const k=crypto.randomUUID();let lose=true;
   const flaky=createOrderService({now:()=>current,store:new PostgresOrderStore({secret,database:{query:async(q,p)=>{const rows=await query(q,p);if(lose&&q.includes('create-idempotent')){lose=false;throw Error('SYNTHETIC_LOSS_AFTER_COMMIT');}return rows;}}})});
   assert.equal((await call('POST',payload(),k,{},false,flaky)).statusCode,503);
   const restored=await call('POST',payload(),k);assert.equal(restored.statusCode,201);
   assert.equal((await call('POST',payload(),k)).body.id,restored.body.id);
   assert.equal((await query('SELECT count(*)::int n FROM sanka_orders'))[0].n,3);
   const unavailable=createOrderService({now:()=>current,store:new PostgresOrderStore({secret,database:{query:async()=>{throw Error('SYNTHETIC_OFFLINE');}}})});
   assert.equal((await call('POST',payload(),crypto.randomUUID(),{},false,unavailable)).statusCode,503);
   assert.equal((await query('SELECT count(*)::int n FROM sanka_orders'))[0].n,3);
 });
 test('nativo: delivery pendente/negado, confirmação autenticada e auditável, frete não presumido',async()=>{
   const invalid=payload('delivery');invalid.fulfillment.address.neighborhood='';assert.equal((await call('POST',invalid,crypto.randomUUID())).statusCode,400);
   const created=(await call('POST',payload('delivery'),crypto.randomUUID())).body.order;
   assert.equal(created.pricing.deliveryFee,null);assert.equal(created.pricing.totalIsFinal,false);
   const id={id:created.id},confirmation={areaConfirmed:true,customerAccepted:true,deliveryFeeCents:650,totalCents:4440};
   assert.equal((await call('PATCH',{status:'preparando'},null,id,true)).statusCode,409);
   assert.equal((await call('PATCH',{action:'confirm_delivery',confirmation},null,id,false)).statusCode,401);
   assert.equal((await call('PATCH',{action:'confirm_delivery',confirmation:{...confirmation,areaConfirmed:false}},null,id,true)).statusCode,400);
   const confirmed=await Promise.all(Array.from({length:10},()=>call('PATCH',{action:'confirm_delivery',confirmation},null,id,true)));
   assert(confirmed.every(r=>r.statusCode===200));assert.equal((await query("SELECT count(*)::int n FROM sanka_order_events WHERE event_kind='delivery_confirmed'"))[0].n,1);
   assert.equal((await call('PATCH',{status:'preparando'},null,id,true)).statusCode,200);
   await assert.rejects(run('UPDATE sanka_orders SET payload_encrypted=payload_encrypted'),/immutable/);
 });
 test('nativo: fechamento bloqueia API direta, recuperação e retirada continuam corretas',async()=>{
   current=new Date('2026-11-11T23:30:00-03:00');
   assert.equal((await call('POST',payload(),crypto.randomUUID())).body.code,'STORE_CLOSED');
   assert.equal((await call('POST',payload(),key)).body.id,original);
   const stored=await store().get(original);assert.equal(stored.pricing.deliveryFee,0);assert.equal(stored.fulfillment.address,null);
   assert.equal((await call('GET',null,null,{list:'1',day:'2026-11-11'})).statusCode,401);
 });
 global.fetch=async()=>{throw Error('EXTERNAL_NETWORK_DISABLED');};
}
