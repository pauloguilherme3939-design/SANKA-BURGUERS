'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {NeonPostgresDatabase}=require('../lib/postgres-database.js');
test('schema incompleto falha sem DDL, sem INSERT e permite nova validação após erro',async()=>{
 const calls=[];let complete=false;
 const database=new NeonPostgresDatabase({connectionString:'postgresql://synthetic-injected-only',neonFactory:()=>({query:async q=>{calls.push(q);return (complete?['001_neon_core','002_order_archive_event_kind','003_order_confirmation_idempotency']:['001_neon_core']).map(id=>({id}));}})});
 await assert.rejects(database.ensureSchema(),/incompatível/);
 assert(calls.every(q=>/^SELECT /.test(q)));
 complete=true;await database.ensureSchema();await database.ensureSchema();assert.equal(calls.length,2);
});
