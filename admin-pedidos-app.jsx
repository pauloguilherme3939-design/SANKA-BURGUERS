// admin-pedidos-app.jsx — Painel de pedidos · Sanka Burgers

import { requestAdminOrderUpdate } from './lib/admin-order-request.mjs';
import {
  buildAdminWhatsAppUrl,
  elapsedLabel,
  sortActiveOldestFirst,
  summarizeOrders,
} from './lib/admin-order-view.mjs';

const { useState, useEffect, useMemo, useRef } = React;

const STATUSES = ['recebido','preparando','na_chapa','finalizando','saiu_entrega','entregue'];
const STATUS_LABELS = {
  recebido:     'Recebido',
  preparando:   'Preparando',
  na_chapa:     'Na Chapa',
  finalizando:  'Finalizando',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue:     'Entregue',
  cancelado:    'Cancelado',
};
const STATUS_COLORS = {
  recebido:     '#6B7280',
  preparando:   '#F59E0B',
  na_chapa:     '#EA580C',
  finalizando:  '#F97316',
  saiu_entrega: '#3B82F6',
  entregue:     '#22C55E',
  cancelado:    '#DC2626',
};

function nextStatus(current) {
  const i = STATUSES.indexOf(current);
  if (i < 0) return null;
  return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || 'Não informado';
}

function paymentLabel(payment = {}) {
  if (payment.method === 'pix') return 'Pix';
  if (payment.method === 'card') return 'Cartão na entrega';
  if (payment.method === 'cash') return payment.change ? `Dinheiro · troco para ${payment.change}` : 'Dinheiro';
  return 'Não informado';
}

function todayInSanka() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function responseError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

/* ── Login ───────────────────────────────────────────────────── */
function Login({ onAuth }) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const response = await fetch('/api/pedido?list=1', {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!response.ok) throw new Error(await responseError(response, 'Não foi possível entrar.'));
      onAuth(pwd);
    } catch (error) {
      setErr(error?.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
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
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading || !pwd} style={{ justifyContent:'center' }}>
          {loading ? 'ENTRANDO...' : 'ENTRAR'}
        </button>
        {err && <p style={{ color:'var(--fire-l)', fontFamily:'var(--f-m)', fontSize:12, textAlign:'center' }}>{err}</p>}
      </form>
    </div>
  );
}

/* ── Order card ──────────────────────────────────────────────── */
function OrderCard({ order, token, onUpdate, onUnauthorized, mode = 'operation', isNew = false, now = Date.now() }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const next = nextStatus(order.status);

  async function advance() {
    if (!next) return;
    setLoading(true);
    setError('');
    try {
      const updated = await requestAdminOrderUpdate({
        orderId: order.id,
        token,
        payload: { status: next },
      });
      onUpdate(updated);
    } catch (requestError) {
      if (requestError?.status === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError?.message || 'Erro de conexão ao atualizar o pedido.');
    }
    finally { setLoading(false); }
  }

  async function cancelOrder() {
    if (!window.confirm(`Cancelar definitivamente o pedido ${order.id}? O pedido continuará no histórico.`)) return;
    setLoading(true);
    setError('');
    try {
      const updated = await requestAdminOrderUpdate({
        orderId: order.id,
        token,
        payload: { action: 'cancel' },
      });
      onUpdate(updated);
    } catch (requestError) {
      if (requestError?.status === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError?.message || 'Erro de conexão ao cancelar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  async function setArchived(archived) {
    const verb = archived ? 'Arquivar' : 'Restaurar';
    const detail = archived
      ? 'Ele sairá da lista principal, mas continuará salvo com todo o histórico.'
      : 'Ele voltará para a lista de encerrados.';
    if (!window.confirm(`${verb} o pedido ${order.id}? ${detail}`)) return;
    setLoading(true);
    setError('');
    try {
      const updated = await requestAdminOrderUpdate({
        orderId: order.id,
        token,
        payload: { action: archived ? 'archive' : 'restore' },
      });
      onUpdate(updated);
    } catch (requestError) {
      if (requestError?.status === 401) {
        onUnauthorized();
        return;
      }
      setError(requestError?.message || `Erro de conexão ao ${archived ? 'arquivar' : 'restaurar'} o pedido.`);
    } finally {
      setLoading(false);
    }
  }

  const t = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  const whatsappUrl = buildAdminWhatsAppUrl(order);
  const delivery = order.fulfillment?.type === 'delivery';
  const address = order.fulfillment?.address;

  return (
    <article className={`adm-pedido-card${mode === 'kitchen' ? ' adm-pedido-card--kitchen' : ''}${isNew ? ' is-new' : ''}`}>
      <div className="adm-pedido-head">
        <div>
          <span className="adm-pedido-id">#{order.id}</span>
          <span className="adm-pedido-time">{t} · esperando {elapsedLabel(order.createdAt, now)}</span>
        </div>
        <span role="status" className="adm-pedido-status" style={{ background: (STATUS_COLORS[order.status] || '#6B7280') + '22', color: STATUS_COLORS[order.status] || '#6B7280', border: `1px solid ${STATUS_COLORS[order.status] || '#6B7280'}55` }}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      {isNew && <div className="adm-new-order">NOVO PEDIDO</div>}
      {order.archived && <div className="adm-pedido-archived">ARQUIVADO · DADOS E HISTÓRICO PRESERVADOS</div>}
      {order.customer?.name && (
        <div className="adm-customer-row">
          <div>
            <strong>{order.customer.name}</strong>
            <span>{formatPhone(order.customer.phone)}</span>
          </div>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="adm-whatsapp-button">
              Falar com cliente
            </a>
          )}
        </div>
      )}
      <div className="adm-order-meta">
        <div><span>Atendimento</span><strong>{delivery ? 'Entrega' : 'Retirada'}</strong></div>
        <div><span>Pagamento</span><strong>{paymentLabel(order.payment)}</strong></div>
      </div>
      {delivery && address && (
        <div className="adm-address">
          <span>Endereço</span>
          <strong>{address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ''}</strong>
          <small>{address.neighborhood}{address.cep ? ` · CEP ${address.cep}` : ''}</small>
        </div>
      )}
      {order.items?.length > 0 && (
        <div className="adm-pedido-items">
          {order.items.map((item, i) => (
            <div key={item.id || i} className="adm-pedido-item">
              {typeof item === 'string' ? item : (
                <>
                  <strong>{item.quantity}×</strong> {item.name} — {brl(item.lineTotal)}
                  {item.note && <div className="adm-item-note">OBS.: {item.note}</div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {order.pricing && (
        <div className="adm-pricing">
          <span>Subtotal <strong>{brl(order.pricing.subtotal)}</strong></span>
          {Number(order.pricing.discount) > 0 && <span>Desconto <strong>−{brl(order.pricing.discount)}</strong></span>}
          <span>Entrega <strong>{order.pricing.deliveryFee === null ? 'A confirmar' : brl(order.pricing.deliveryFee)}</strong></span>
          <span className="adm-pedido-total">Total <strong>{order.pricing.totalIsFinal === false ? `${brl(order.pricing.total)} + entrega` : brl(order.pricing.total)}</strong></span>
        </div>
      )}
      {mode !== 'kitchen' && order.history?.length > 0 && (
        <details className="adm-history">
          <summary>Ver histórico ({order.history.length})</summary>
          {order.history.map((event, index) => (
            <div key={`${event.status}-${event.ts}-${index}`}>
              <span>{STATUS_LABELS[event.status] || event.status}</span>
              <time>{new Date(event.ts).toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</time>
            </div>
          ))}
        </details>
      )}
      {error && <p className="pedido-search-err" role="alert">{error}</p>}
      {next && (
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:12 }} onClick={advance} disabled={loading}>
          {loading ? 'Atualizando...' : `→ ${STATUS_LABELS[next] || next}`}
        </button>
      )}
      {next && (
        <button className="btn btn-outline" style={{ width:'100%', justifyContent:'center', marginTop:8, color:'#DC2626', borderColor:'#DC2626' }} onClick={cancelOrder} disabled={loading}>
          CANCELAR PEDIDO
        </button>
      )}
      {order.status === 'entregue' && <div style={{ textAlign:'center', marginTop:12, color:'#22C55E', fontFamily:'var(--f-m)', fontSize:12, letterSpacing:'0.12em' }}>✓ ENTREGUE</div>}
      {order.status === 'cancelado' && <div style={{ textAlign:'center', marginTop:12, color:'#DC2626', fontFamily:'var(--f-m)', fontSize:12, letterSpacing:'0.12em' }}>PEDIDO CANCELADO · HISTÓRICO PRESERVADO</div>}
      {['entregue', 'cancelado'].includes(order.status) && !order.archived && (
        <button className="btn btn-outline adm-archive-button" onClick={() => setArchived(true)} disabled={loading}>
          ARQUIVAR DO PAINEL
        </button>
      )}
      {order.archived && (
        <button className="btn btn-outline adm-archive-button" onClick={() => setArchived(false)} disabled={loading}>
          RESTAURAR PEDIDO
        </button>
      )}
    </article>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ token, onUnauthorized }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [day, setDay] = useState(todayInSanka);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mode, setMode] = useState('operation');
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const knownOrderIds = useRef(new Set());

  async function fetchOrders(silent = false) {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const r = await fetch(`/api/pedido?list=1&day=${encodeURIComponent(day)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) {
        onUnauthorized();
        return;
      }
      if (!r.ok) throw new Error(await responseError(r, 'Não foi possível carregar os pedidos.'));
      const loadedOrders = await r.json();
      if (knownOrderIds.current.size > 0) {
        const received = loadedOrders
          .filter(order => !knownOrderIds.current.has(order.id) && !order.archived)
          .map(order => order.id);
        if (received.length) {
          setNewOrderIds(received);
          window.setTimeout(() => setNewOrderIds([]), 12000);
        }
      }
      knownOrderIds.current = new Set(loadedOrders.map(order => order.id));
      setOrders(loadedOrders);
      setLastUpdated(new Date());
    } catch (error) {
      setLoadError(error?.message || 'Erro de conexão ao carregar pedidos.');
    }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    knownOrderIds.current = new Set();
    fetchOrders();
    const iv = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(iv);
  }, [day]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  function handleUpdate(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR');
    return orders.filter(order => {
      if (statusFilter === 'archived' && !order.archived) return false;
      if (statusFilter !== 'all' && statusFilter !== 'archived' && order.status !== statusFilter) return false;
      if (!needle) return true;
      const searchable = [
        order.id,
        order.customer?.name,
        order.customer?.phone,
        ...(order.items || []).map(item => item?.name || item),
      ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return searchable.includes(needle);
    });
  }, [orders, query, statusFilter]);

  const active = sortActiveOldestFirst(filtered.filter(o => !o.archived && !['entregue', 'cancelado'].includes(o.status)));
  const done = filtered.filter(o => !o.archived && ['entregue', 'cancelado'].includes(o.status));
  const archived = filtered.filter(o => o.archived);
  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const count = status => summary.statusCounts[status] || 0;

  return (
    <div className={`adm-pedidos-layout${mode === 'kitchen' ? ' is-kitchen' : ''}`}>
      <header className="adm-pedidos-header">
        <div className="wrap">
          <div className="adm-header-row">
            <a href="index.html" className="nav-logo"><div className="nav-logo-mark">S</div><div className="nav-logo-name">SANKA<b>.</b></div></a>
            <div className="adm-view-switch" role="group" aria-label="Visualização do painel">
              <button className={mode === 'operation' ? 'is-active' : ''} onClick={() => setMode('operation')}>Operação</button>
              <button className={mode === 'kitchen' ? 'is-active' : ''} onClick={() => setMode('kitchen')}>Modo Cozinha</button>
            </div>
            <div className="adm-header-actions">
              <button className="btn btn-outline btn-sm" onClick={() => fetchOrders(false)}>Atualizar</button>
              <button className="btn btn-outline btn-sm" onClick={onUnauthorized}>Sair</button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="adm-main">
        <div className="wrap adm-main-wrap">

          <div className="adm-live-line" aria-live="polite">
            <span>{mode === 'kitchen' ? 'Pedidos mais antigos aparecem primeiro' : `Pedidos de ${day.split('-').reverse().join('/')}`}</span>
            <span>{lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}` : 'Atualizando...'}</span>
          </div>
          {newOrderIds.length > 0 && <div className="adm-new-alert" role="status">Novo pedido recebido · confira o topo da fila</div>}

          {mode === 'operation' && <section className="adm-overview" aria-label="Resumo e filtros dos pedidos">
            <div className="adm-stats adm-stats--business">
              <div><strong>{summary.total}</strong><span>Pedidos</span></div>
              <div><strong>{summary.active}</strong><span>Ativos</span></div>
              <div><strong>{summary.delivered}</strong><span>Entregues</span></div>
              <div><strong>{summary.cancelled}</strong><span>Cancelados</span></div>
              <div><strong>{brl(summary.grossValue)}</strong><span>Valor bruto</span></div>
              <div><strong>{brl(summary.averageTicket)}</strong><span>Ticket médio</span></div>
              <div><strong>{summary.pickup}</strong><span>Retiradas</span></div>
              <div><strong>{summary.delivery}</strong><span>Entregas</span></div>
            </div>
            <div className="adm-status-strip" aria-label="Pedidos por etapa">
              {STATUSES.map(status => <span key={status}><strong>{count(status)}</strong>{STATUS_LABELS[status]}</span>)}
            </div>
            <div className="adm-toolbar">
              <label>
                <span>Data</span>
                <input type="date" value={day} onChange={event => setDay(event.target.value)} />
              </label>
              <label className="adm-toolbar-search">
                <span>Buscar</span>
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pedido, cliente, telefone ou item" />
              </label>
              <label>
                <span>Status</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  <option value="archived">Arquivados</option>
                </select>
              </label>
            </div>
            <p className="adm-overview-note">Valor bruto não é lucro. Arquivar organiza o painel sem apagar pedido nem histórico.</p>
          </section>}

          {mode === 'kitchen' && (
            <section className="adm-kitchen-summary" aria-label="Fila da cozinha">
              <div><strong>{active.length}</strong><span>na fila</span></div>
              <p>Atualização automática a cada 30 segundos. Observações aparecem em destaque.</p>
            </section>
          )}

          {/* Pedidos ativos */}
          <div className="adm-section-title">
            {mode === 'kitchen' ? `Fila da cozinha (${active.length})` : `Ativos (${active.length})`}
          </div>
          {loading && <p style={{ color:'var(--ink-mute)', fontFamily:'var(--f-m)', fontSize:12 }}>Carregando...</p>}
          {loadError && <p className="pedido-search-err" role="alert">{loadError}</p>}
          {!loading && active.length === 0 && (
            <p style={{ color:'var(--ink-mute)', fontFamily:'var(--f-m)', fontSize:12 }}>Nenhum pedido ativo.</p>
          )}
          <div className="adm-pedidos-grid">
            {active.map(o => <OrderCard key={o.id} order={o} token={token} onUpdate={handleUpdate} onUnauthorized={onUnauthorized} mode={mode} isNew={newOrderIds.includes(o.id)} now={now} />)}
          </div>

          {/* Encerrados */}
          {mode === 'operation' && done.length > 0 && (
            <>
              <div style={{ marginBottom:8, fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:32 }}>
                Encerrados ({done.length})
              </div>
              <div className="adm-pedidos-grid">
                {done.map(o => <OrderCard key={o.id} order={o} token={token} onUpdate={handleUpdate} onUnauthorized={onUnauthorized} now={now} />)}
              </div>
            </>
          )}

          {mode === 'operation' && archived.length > 0 && (
            <>
              <div style={{ marginBottom:8, fontFamily:'var(--f-m)', fontSize:11, color:'var(--ink-mute)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:32 }}>
                Arquivados ({archived.length})
              </div>
              <div className="adm-pedidos-grid">
                {archived.map(o => <OrderCard key={o.id} order={o} token={token} onUpdate={handleUpdate} onUnauthorized={onUnauthorized} now={now} />)}
              </div>
            </>
          )}

          {mode === 'operation' && !loading && !loadError && filtered.length === 0 && (query || statusFilter !== 'all') && (
            <p className="adm-empty-filter">Nenhum pedido corresponde aos filtros.</p>
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

  function handleUnauthorized() {
    sessionStorage.removeItem('sk-admin-pwd');
    setToken('');
  }

  return token
    ? <Dashboard token={token} onUnauthorized={handleUnauthorized} />
    : <Login onAuth={handleAuth} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<AdminPedidosApp />);
