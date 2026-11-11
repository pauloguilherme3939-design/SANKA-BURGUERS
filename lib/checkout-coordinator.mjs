export const CHECKOUT_STATE_KEY = 'sanka_checkout_state_v2';
export const CART_STORAGE_KEY = 'sanka_cart_launch_2026';
const LOCK = 'sanka-checkout-state-v2';
const clone = v => JSON.parse(JSON.stringify(v));
export function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
const identity = v => JSON.stringify(canonical(v));
async function fingerprintOf(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function immutable(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(immutable); Object.freeze(v); }
  return v;
}
const requestItems = items => items.map(i => ({ id:i.id, qty:i.qty, note:i.note ?? i.obs ?? '' }));
export function createCheckoutCoordinator({ storage, locks, uuid = () => crypto.randomUUID(), notify = () => {} }) {
  function read() {
    const raw = storage?.getItem(CHECKOUT_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.version !== 2 || !state.cart?.revision || !Array.isArray(state.cart.items) || !state.attempts || !state.byRevision) throw new Error('Estado do checkout inválido. Dados preservados; recupere a tentativa antes de reenviar.');
    return state;
  }
  function save(state) {
    storage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(state));
    notify();
  }
  async function load() {
    let state=read();
    if (state) return state;
    const items=JSON.parse(storage.getItem(CART_STORAGE_KEY)||'[]');
    if (!Array.isArray(items)) throw new Error('Carrinho inválido; dados preservados.');
    state={version:2,cart:{revision:uuid(),items},attempts:{},byRevision:{}};
    const legacy=JSON.parse(storage.getItem('sanka_checkout_attempt_v1')||'null');
    if (legacy) {
      const payload=JSON.parse(legacy.fingerprint);
      if (!legacy.key || !Array.isArray(payload?.items)) throw new Error('Tentativa anterior inválida; dados preservados.');
      state.attempts[legacy.key]={...legacy,fingerprint:await fingerprintOf(payload),payload,revision:state.cart.revision,status:'pending',effectsClaimed:false};
      state.byRevision[state.cart.revision]=legacy.key;
    }
    save(state); // Legacy storage is preserved. The complete v2 record is now authoritative.
    return state;
  }
  async function locked(fn) {
    if (!storage || !locks?.request) throw new Error('Este navegador não oferece coordenação segura entre abas. Nenhum pedido foi enviado. Reabra em um navegador compatível para recuperar a tentativa.');
    return locks.request(LOCK,{mode:'exclusive'},async()=>fn(await load()));
  }
  function snapshot() {
    const state=read();
    return immutable(state?clone(state.cart):{revision:null,items:JSON.parse(storage?.getItem(CART_STORAGE_KEY)||'[]')});
  }
  const ref = r => immutable(clone({key:r.key,revision:r.revision,fingerprint:r.fingerprint,payload:r.payload}));
  function recordFor(state,attempt) {
    const r=state.attempts[attempt.key];
    if (!r || r.revision!==attempt.revision || r.fingerprint!==attempt.fingerprint) throw new Error('Identidade da tentativa não confere. Dados preservados.');
    return r;
  }
  return {
    snapshot,
    initialize:()=>locked(s=>immutable(clone(s.cart))),
    mutateCart:change=>locked(s=>{
      const items=change(clone(s.cart.items));
      if (!Array.isArray(items)) throw new Error('Alteração de carrinho inválida.');
      s.cart={revision:uuid(),items};save(s);return immutable(clone(s.cart));
    }),
    prepare:(payload,revision)=>{
      const captured=clone(payload); // Capture before queuing for a lock or awaiting a digest.
      return locked(async s=>{
      if (s.cart.revision!==revision) throw new Error('O carrinho mudou em outra aba. Confira os itens antes de enviar.');
      if (identity(requestItems(captured.items))!==identity(requestItems(s.cart.items))) throw new Error('Os itens mudaram. Confira o carrinho antes de enviar.');
      const fingerprint=await fingerprintOf(captured),previous=s.attempts[s.byRevision[revision]];
      if (previous) {
        if (previous.fingerprint!==fingerprint) throw new Error('Há uma tentativa pendente com outros dados. Recupere o pedido anterior antes de alterar o checkout.');
        return ref(previous);
      }
      const r={key:uuid(),revision,fingerprint,payload:captured,status:'pending',effectsClaimed:false};
      s.attempts[r.key]=r;s.byRevision[revision]=r.key;save(s);return ref(r);
      });
    },
    pendingPayload:revision=>{
      const s=read(),r=s?.attempts[s.byRevision[revision??s.cart.revision]];
      return r&&!['completed','rejected','recovered'].includes(r.status)?clone(r.payload):null;
    },
    pendingAttempts:()=>{
      const s=read();return s?Object.values(s.attempts).filter(r=>['pending','persisted'].includes(r.status)).map(ref):[];
    },
    reject:attempt=>locked(s=>{
      const r=recordFor(s,attempt);if(r.status!=='pending')return;
      r.status='rejected';if(s.byRevision[attempt.revision]===attempt.key)delete s.byRevision[attempt.revision];save(s);
    }),
    markRecovered:attempt=>locked(s=>{
      const r=recordFor(s,attempt);
      if(r.order && r.status!=='completed'){r.status='recovered';delete r.payload;}
      save(s);
    }),
    finish:(attempt,order,onConfirmed)=>locked(async s=>{
      const r=recordFor(s,attempt);
      if(r.order&&r.order.id!==order.id)throw new Error('IDs diferentes para a mesma tentativa. Dados preservados.');
      r.order={id:order.id};if(!['completed','recovered'].includes(r.status))r.status='persisted';save(s);
      const current=s.cart.revision===attempt.revision&&s.byRevision[attempt.revision]===attempt.key;
      if(!current||['completed','recovered'].includes(r.status))return {finalized:false,order:clone(order)};
      const allowExternalEffects=!r.effectsClaimed;r.effectsClaimed=true;save(s);
      // Keep the ownership check, callback and cart finalization under the same lock.
      await onConfirmed(order,{allowExternalEffects,attempt});
      r.status='completed';delete r.payload;s.cart={revision:uuid(),items:[]};save(s);
      return {finalized:true,order:clone(order)};
    }),
  };
}
let browserCoordinator;
export function getCheckoutCoordinator() {
  let storage=null;
  try { if(typeof window!=='undefined')storage=window.localStorage; } catch {}
  if(!browserCoordinator)browserCoordinator=createCheckoutCoordinator({
    storage,
    locks:globalThis.navigator?.locks,
    notify:()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('sanka:checkout-state'));},
  });
  return browserCoordinator;
}
