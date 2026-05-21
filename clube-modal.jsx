// clube-modal.jsx — Clube Sanka: banner + modal de cadastro
// Cria seu próprio React root (#clube-root) — não interfere com o #root de cada página.

import { SANKA_CONFIG } from './lib/config.js'

const { useState, useEffect, useRef } = React;

/* ── Config ──────────────────────────────────────────────────── */
const CLUBE_WA     = SANKA_CONFIG.whatsapp;
const LS_JOINED    = 'sanka_clube_joined';
const LS_DISMISSED = 'sanka_clube_dismissed';
const DISMISS_TTL  = 7 * 24 * 60 * 60 * 1000; // 7 dias

/* ── Utilitários ─────────────────────────────────────────────── */
function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskBirthday(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function formatWADisplay(num) {
  if (num.length === 11) return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
  if (num.length === 10) return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
  return num;
}

/* ── Banner ──────────────────────────────────────────────────── */
function ClubeBanner({ visible, onOpen, onDismiss }) {
  return (
    <div className={`clube-banner${visible ? ' clube-banner--visible' : ''}`} role="complementary" aria-label="Clube Sanka">
      <span className="clube-banner-icon" aria-hidden="true">🍔</span>
      <p className="clube-banner-text">
        Cadastre seu WhatsApp e ganhe o{' '}
        <strong>10º lanche grátis.</strong>
        <span className="clube-banner-sub"> Sem app, sem cartão.</span>
      </p>
      <button className="clube-banner-btn" onClick={onOpen}>
        ENTRAR NO CLUBE
      </button>
      <button className="clube-banner-close" onClick={onDismiss} aria-label="Fechar banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Modal de cadastro ───────────────────────────────────────── */
const INIT_FORM = { name: '', whatsapp: '', birthday: '', lgpd: false };

function ClubeModal({ onClose }) {
  const [step,        setStep]        = useState('form');
  const [form,        setForm]        = useState(INIT_FORM);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [loading,     setLoading]     = useState(false);
  const firstInput = useRef(null);

  useEffect(() => {
    firstInput.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Informe seu nome completo.';
    const wa = form.whatsapp.replace(/\D/g, '');
    if (wa.length < 10 || wa.length > 11)
      errs.whatsapp = 'WhatsApp inválido (ex: (19) 9 1234-5678).';
    if (form.birthday) {
      const m = form.birthday.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12)
        errs.birthday = 'Use o formato DD/MM (ex: 25/03).';
    }
    if (!form.lgpd)
      errs.lgpd = 'Você precisa aceitar para continuar.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/clube', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name.trim(),
          whatsapp: form.whatsapp.replace(/\D/g, ''),
          birthday: form.birthday || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error || 'Algo deu errado. Tente novamente.');
        return;
      }
      localStorage.setItem(LS_JOINED, '1');
      if (window.SankaAnalytics) SankaAnalytics.joinClub();
      setStep('success');
    } catch {
      setServerError('Sem conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && step === 'success') onClose();
  }

  return (
    <div className="clube-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Cadastro Clube Sanka">
      <div className="clube-modal">

        {/* Header */}
        <div className="clube-modal-head">
          <div className="clube-modal-badge" aria-hidden="true">
            <span className="clube-badge-num">10×</span>
            <span className="clube-badge-label">lanche{'\n'}grátis</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="clube-modal-title">CLUBE SANKA</h2>
            <p className="clube-modal-sub">
              {step === 'form'
                ? 'Cadastre-se. É grátis, instantâneo e sem enrolação.'
                : 'Você está dentro. Bem-vindo ao Clube.'}
            </p>
          </div>
          {step === 'success' && (
            <button className="clube-close-btn" onClick={onClose} aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Form */}
        {step === 'form' && (
          <form className="clube-form" onSubmit={handleSubmit} noValidate>

            <div className="clube-field">
              <label className="clube-label" htmlFor="ck-name">Nome</label>
              <input
                id="ck-name"
                ref={firstInput}
                className={`clube-input${errors.name ? ' clube-input--err' : ''}`}
                type="text"
                placeholder="Seu nome completo"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                autoComplete="name"
              />
              {errors.name && <span className="clube-err" role="alert">{errors.name}</span>}
            </div>

            <div className="clube-field">
              <label className="clube-label" htmlFor="ck-wa">WhatsApp</label>
              <input
                id="ck-wa"
                className={`clube-input${errors.whatsapp ? ' clube-input--err' : ''}`}
                type="tel"
                placeholder="(19) 9 1234-5678"
                value={form.whatsapp}
                onChange={e => set('whatsapp', maskPhone(e.target.value))}
                autoComplete="tel"
                inputMode="numeric"
              />
              {errors.whatsapp && <span className="clube-err" role="alert">{errors.whatsapp}</span>}
            </div>

            <div className="clube-field">
              <label className="clube-label" htmlFor="ck-bday">
                Aniversário
                <span className="clube-label-opt"> (opcional — ganha cupom no seu dia)</span>
              </label>
              <input
                id="ck-bday"
                className={`clube-input${errors.birthday ? ' clube-input--err' : ''}`}
                type="text"
                placeholder="DD/MM"
                value={form.birthday}
                onChange={e => set('birthday', maskBirthday(e.target.value))}
                inputMode="numeric"
                maxLength={5}
                style={{ maxWidth: 110 }}
              />
              {errors.birthday && <span className="clube-err" role="alert">{errors.birthday}</span>}
            </div>

            <label className={`clube-lgpd${errors.lgpd ? ' clube-lgpd--err' : ''}`}>
              <input
                type="checkbox"
                checked={form.lgpd}
                onChange={e => set('lgpd', e.target.checked)}
              />
              <span>
                Aceito receber mensagens da Sanka Burgers no meu WhatsApp.
                Posso pedir pra sair a qualquer momento.
              </span>
            </label>
            {errors.lgpd && <span className="clube-err" role="alert">{errors.lgpd}</span>}

            {serverError && (
              <div className="clube-server-err" role="alert">{serverError}</div>
            )}

            <button type="submit" className="clube-submit" disabled={loading}>
              {loading ? 'Cadastrando…' : 'QUERO ENTRAR'}
            </button>

          </form>
        )}

        {/* Sucesso */}
        {step === 'success' && (
          <div className="clube-success">
            <div className="clube-success-icon" aria-hidden="true">🎉</div>
            <h3 className="clube-success-title">Você está dentro!</h3>
            <p className="clube-success-body">
              Sempre que pedir, mande seu pedido pelo WhatsApp{' '}
              <strong>{formatWADisplay(CLUBE_WA)}</strong> com{' '}
              <em className="clube-success-phrase">"Sou do Clube Sanka"</em>{' '}
              que a gente conta pra você.
            </p>
            <p className="clube-success-note">
              No <strong>10º pedido</strong>, você escolhe qualquer hambúrguer do cardápio. Por nossa conta.
            </p>
            <a href="cardapio.html" className="clube-submit" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
              Ver cardápio agora →
            </a>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── App principal ───────────────────────────────────────────── */
function ClubeApp() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_JOINED)) return;
    const dismissed = localStorage.getItem(LS_DISMISSED);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_TTL) return;
    const timer = setTimeout(() => setBannerVisible(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  function openModal() {
    setBannerVisible(false);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  function dismiss() {
    localStorage.setItem(LS_DISMISSED, Date.now().toString());
    setBannerVisible(false);
  }

  return (
    <>
      <ClubeBanner visible={bannerVisible} onOpen={openModal} onDismiss={dismiss} />
      {modalOpen && <ClubeModal onClose={closeModal} />}
    </>
  );
}

/* ── Mount em nó separado ─────────────────────────────────────── */
(function () {
  const mount = document.createElement('div');
  mount.id = 'clube-root';
  document.body.appendChild(mount);
  ReactDOM.createRoot(mount).render(<ClubeApp />);
})();
