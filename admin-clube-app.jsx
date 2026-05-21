// admin-clube-app.jsx — Painel do Clube Sanka
// Rota: /admin-clube.html (protegida por senha via API)

const { useState, useMemo } = React;

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtWA(num) {
  if (!num) return '—';
  if (num.length === 11) return `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
  if (num.length === 10) return `(${num.slice(0,2)}) ${num.slice(2,6)}-${num.slice(6)}`;
  return num;
}

function exportCSV(members) {
  const rows = [
    ['Nome', 'WhatsApp', 'Aniversário', 'Entrou em'],
    ...members.map(m => [
      m.name,
      fmtWA(m.whatsapp),
      m.birthday || '',
      fmtDate(m.joinedAt),
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `clube-sanka-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Tela de login ───────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [pw,      setPw]      = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) { setError('Informe a senha.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/clube/members?password=${encodeURIComponent(pw)}`);
      const data = await res.json();
      if (res.status === 401) { setError('Senha incorreta.'); return; }
      if (!res.ok)            { setError(data.error || 'Erro no servidor.'); return; }
      onLogin(data, pw);
    } catch {
      setError('Servidor offline. Inicie com: node server.js');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div className="nav-logo-mark" aria-hidden="true" style={{ margin: '0 auto 20px', width: 52, height: 52, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
        <h1 className="adm-login-title">Clube Sanka</h1>
        <p className="adm-login-sub">Painel administrativo</p>
        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          <input
            className="clube-input"
            type="password"
            placeholder="Senha de acesso"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(''); }}
            autoFocus
            style={{ width: '100%', marginBottom: error ? 8 : 12 }}
          />
          {error && <p className="clube-err" style={{ marginBottom: 12 }} role="alert">{error}</p>}
          <button type="submit" className="clube-submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Verificando…' : 'ACESSAR'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ data, password, onRefresh }) {
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);

  const { members, total, birthdaysThisMonth } = data;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.whatsapp.includes(q.replace(/\D/g, ''))
    );
  }, [members, search]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clube/members?password=${encodeURIComponent(password)}`);
      if (res.ok) onRefresh(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-wrap">

      {/* Cabeçalho */}
      <header className="adm-header">
        <div>
          <a href="index.html" className="adm-back">← Voltar ao site</a>
          <h1 className="adm-title">Clube Sanka</h1>
          <p className="adm-subtitle">Painel de membros</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={refresh} disabled={loading}>
            {loading ? '…' : '↻ Atualizar'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => exportCSV(members)}>
            ↓ Exportar CSV
          </button>
        </div>
      </header>

      {/* Métricas */}
      <div className="adm-metrics">
        <div className="adm-metric-card">
          <span className="adm-metric-num">{total}</span>
          <span className="adm-metric-label">Membros totais</span>
        </div>
        <div className="adm-metric-card adm-metric-card--fire">
          <span className="adm-metric-num">{birthdaysThisMonth.length}</span>
          <span className="adm-metric-label">Aniversariantes este mês</span>
        </div>
        <div className="adm-metric-card">
          <span className="adm-metric-num">
            {members.filter(m => m.birthday).length}
          </span>
          <span className="adm-metric-label">Com aniversário cadastrado</span>
        </div>
      </div>

      {/* Aniversariantes do mês */}
      {birthdaysThisMonth.length > 0 && (
        <section className="adm-birthday-sec">
          <h2 className="adm-section-title">🎂 Aniversariantes do mês</h2>
          <div className="adm-birthday-list">
            {birthdaysThisMonth.map(m => (
              <div key={m.id} className="adm-birthday-card">
                <span className="adm-bday-name">{m.name}</span>
                <span className="adm-bday-info">
                  <a href={`https://wa.me/${m.whatsapp}`} target="_blank" rel="noopener noreferrer" className="adm-wa-link">
                    {fmtWA(m.whatsapp)}
                  </a>
                  {m.birthday && <> · {m.birthday}</>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabela de membros */}
      <section className="adm-table-sec">
        <div className="adm-table-head">
          <h2 className="adm-section-title">Membros</h2>
          <input
            className="clube-input adm-search"
            type="search"
            placeholder="Buscar por nome ou WhatsApp…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Aniversário</th>
                <th>Entrou em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="adm-empty">
                    {search ? 'Nenhum membro encontrado para essa busca.' : 'Nenhum membro cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                filtered.slice().reverse().map(m => (
                  <tr key={m.id}>
                    <td className="adm-td-name">{m.name}</td>
                    <td>
                      <a
                        href={`https://wa.me/${m.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="adm-wa-link"
                      >
                        {fmtWA(m.whatsapp)}
                      </a>
                    </td>
                    <td style={{ fontFamily: 'var(--f-m)', fontSize: 13, color: 'var(--ink-dim)' }}>
                      {m.birthday || <span style={{ color: 'var(--ink-mute)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--f-m)', fontSize: 12, color: 'var(--ink-mute)' }}>
                      {fmtDate(m.joinedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <p className="adm-table-count">
            {filtered.length} {filtered.length === 1 ? 'membro' : 'membros'}
            {search ? ` encontrado${filtered.length !== 1 ? 's' : ''}` : ' no total'}
          </p>
        )}
      </section>

    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
function AdminApp() {
  const [data, setData] = useState(null);
  const [pw,   setPw]   = useState('');

  function onLogin(d, password) { setData(d); setPw(password); }

  return data
    ? <Dashboard data={data} password={pw} onRefresh={setData} />
    : <LoginScreen onLogin={onLogin} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp />);
