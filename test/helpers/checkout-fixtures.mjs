import { createCheckoutCoordinator, CART_STORAGE_KEY } from '../../lib/checkout-coordinator.mjs';
export const payload={customer:{name:'TESTE SINTETICO',phone:'19999990000'},items:[{id:'SK-L01',qty:1,note:''}],fulfillment:{type:'pickup',address:null},payment:{method:'pix'}};
export const order={id:'SK-20261103-AAAAAAAAAAAAAAAA',pricing:{total:37.9},items:[]};
export function sharedStorage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};}
export function webLocks(){const tails=new Map();return {request(name,options,callback){if(typeof options==='function')callback=options;const before=tails.get(name)||Promise.resolve();const task=before.catch(()=>{}).then(()=>callback({name}));tails.set(name,task.catch(()=>{}));return task;}};}
export async function fixture(){const storage=sharedStorage(),locks=webLocks();storage.setItem(CART_STORAGE_KEY,JSON.stringify(payload.items));const coordinator=createCheckoutCoordinator({storage,locks});await coordinator.initialize();return {storage,locks,coordinator,revision:coordinator.snapshot().revision};}
export async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('Fixture did not reach barrier');}
