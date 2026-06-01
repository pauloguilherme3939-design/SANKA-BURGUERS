// admin-pedidos-app.jsx — Painel de pedidos · Sanka Burgers

const { useState, useEffect, useRef } = React;

const STATUSES = ['recebido','preparando','na_chapa','finalizando','saiu_entrega','entregue'];
const STATUS_LABELS = {
  recebido:     'Recebido',
  preparando:   'Preparando',
  na_chapa:     'Na Chapa',
  finalizando:  'Finalizando',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue:     'Entregue',
};
const STATUS_COLORS = {
  recebido:     '#6B7280',
  preparando:   '#F59E0B',
  na_chapa:     '#EA580C',
  finalizando:  '#F97316',
  saiu_entrega: '#3B82F6',
  entregue:     '#22C55E',
};

function nextStatus(current) {
  const i = STATUSES.indexOf(current);
  return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}

/* ── Login ───────────────────────────────────────────────────── */
function Login({ onAuth }) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  function submit(e) {
    e.preventDefault();
    fetch('/api/pedido?list=1', { headers: { Authorization: `Bearer ${pwd}` } })
      .then(r => { if (r.ok) onAuth(pwd); else setErr('Senha incorreta.'); })
      .catch(() => setErr('Erro de conexão.'));
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:20, padding:24 }}>
      <div className="nav-logo-mark" style={{ width:52, height:52, fontSize:32, borderRadius:14 }}>S</div>
      <h1 className="section-title" style={{ fontSize:'clamp(28px,5vw,44px)', textAlign:'center' }}>
        PAINEL<br /><em>PEDIDOS</em>
      </h1>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 }}>
        <input
          type="password"
          className="pedido-search-input"
          placeholder="Senha admin"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary btn-lg" type="submit" style={{ justifyContent:'center' }}>
          ENTRAR
        </button>
        {err && <p style={{ color:'var(--fire-l)', fontFamily:'var(--f-m)', fontSize:12, textAlign:'center' }}>{err}</p>}
      </form>
    </div>
  );
}

/* ── Order card ──────────────────────────────────────────────── */
function OrderCard({ order, token, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const next = nextStatus(order.status);

  async function advance() {
    if (!next) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/pedido?id=${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      if (r.ok) { const d = await r.json(); onUpdate(d); }
    } catch {}
    finally { setLoading(false); }
  }

  const t = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  return (
    <div className="adm-pedido-card">
      <div className="adm-pedido-head">
        <div>
          <span className="adm-pedido-id">#{order.id}</span>
          <span className="adm-pedido-time">{t}</span>
        </div>
        <span className="adm-pedido-status" style={{ background: STATUS_COLORS[order.status] + '22', color: STATUS_COLORS[order.status], border: `1px solid ${STATUS_COLORS[order.status]}55` }}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>
      {order.items?.length > 0 && (
        <div className="adm-pedido-items">
          {order.items.map((it, i) => <div key={i} className="adm-pedido-item">{it}</div>)}
        </div>
      )}
      {order.total > 0 && (
        <div className="adm-pedido-total">Total: R$ {order.total.toFixed(2).replace('.', ',')}</div>
      )}
      {next && (
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:12 }} onClick={advance} disabled={loading}>
          {loading ? 'Atualizando...' : `→ ${STATUS_LABELS[next]}`}
        </button>
      )}
      {!next && <div style={{ textAlign:'center', marginTop:12, color:'#22C55E', fontFamily:'var(--f-m)', fontSize:12, letterSpacing:'0.12em' }}>✓ ENTREGUE</div>}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ token }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [newId,   setNewId]   = useState('');
  const [newItem, setNewItem] = useState('');
  const [creating, setCreating] = useState(false);
  const [items,   setItems]   = useState([]);

  async function fetchOrders() {
    try {
      const r = await fetch('/api/pedido?list=1', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setOrders(d); }
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(fetchOrders, 30000);
    return () => clearInterval(iv);
  }, []);

  async function createOrder() {
    setCreating(true);
    try {
      const r = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, name: 'Cliente WA', total: 0 }),
      });
      if (r.ok) {
        const d = await r.json();
        setNewId(d.id);
        setItems([]);
        fetchOrders();
      }
    } catch {}
    finally { setCreating(false); }
  }

  function handleUpdate(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  }

  const active = orders.filter(o => o.status !== 'entregue');
  const done   = orders.filter(o => o.status === 'entregue');

  return (
    <div className="adm-pedidos-layout">
      <header className="adm-pedidos-header">
        <div className="wrap">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0' }}>
            <a href="index.html" className="nav-logo"><div className="nav-logo-mark">S</div><div className="nav-logo-name">SANKA<b>.</b></div></a>
            <span style={{ fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              Pedidos · {new Date().toLocaleDateString('pt-BR')}
            </span>
            <button className="btn btn-outline btn-sm" onClick={fetchOrders}>Atualizar</button>
          </div>
        </div>
      </header>

      <main style={{ padding:'32px 0 100px' }}>
        <div className="wrap" style={{ maxWidth:760 }}>

          {/* Criar novo pedido */}
          <div className="adm-create-order">
            <div style={{ fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:12 }}>
              Novo Pedido
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input
                className="pedido-search-input"
                style={{ flex:1, padding:'10px 14px', fontSize:14 }}
                placeholder="Ex: X Hamburgão + Batata"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { setItems(p => [...p, newItem.trim()]); setNewItem(''); } }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => { if (newItem.trim()) { setItems(p => [...p, newItem.trim()]); setNewItem(''); } }}>+</button>
            </div>
            {items.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {items.map((it, i) => (
                  <span key={i} style={{ background:'rgba(234,88,12,0.12)', border:'1px solid rgba(234,88,12,0.3)', color:'var(--fire-l)', padding:'3px 10px', borderRadius:'var(--pill)', fontFamily:'var(--f-m)', fontSize:11 }}>
                    {it} <button style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', marginLeft:4 }} onClick={() => setItems(p => p.filter((_,j)=>j!==i))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button className="btn btn-primary" onClick={createOrder} disabled={creating || items.length === 0} style={{ justifyContent:'center' }}>
                {creating ? 'Criando...' : 'CRIAR PEDIDO'}
              </button>
              {newId && (
                <span style={{ fontFamily:'var(--f-m)', fontSize:12, color:'#4ade80', letterSpacing:'0.1em' }}>
                  ✓ Código: <strong>{newId}</strong>
                  <button className="btn btn-outline btn-sm" style={{ marginLeft:8 }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/pedido.html?id=${newId}`).catch(()=>{}); }}>
                    Copiar link
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Pedidos ativos */}
          <div style={{ marginBottom:8, fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:40 }}>
            Ativos ({active.length})
          </div>
          {loading && <p style={{ color:'var(--ink-mute)', fontFamily:'var(--f-m)', fontSize:12 }}>Carregando...</p>}
          {!loading && active.length === 0 && (
            <p style={{ color:'var(--ink-mute)', fontFamily:'var(--f-m)', fontSize:12 }}>Nenhum pedido ativo.</p>
          )}
          <div className="adm-pedidos-grid">
            {active.map(o => <OrderCard key={o.id} order={o} token={token} onUpdate={handleUpdate} />)}
          </div>

          {/* Entregues */}
          {done.length > 0 && (
            <>
              <div style={{ marginBottom:8, fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:32 }}>
                Entregues ({done.length})
              </div>
              <div className="adm-pedidos-grid">
                {done.map(o => <OrderCard key={o.id} order={o} token={token} onUpdate={handleUpdate} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
function AdminPedidosApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem('sk-admin-pwd') || '');

  function handleAuth(pwd) {
    sessionStorage.setItem('sk-admin-pwd', pwd);
    setToken(pwd);
  }

  return token ? <Dashboard token={token} /> : <Login onAuth={handleAuth} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<AdminPedidosApp />);
