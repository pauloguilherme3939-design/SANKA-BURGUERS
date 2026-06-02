// oferta-app.jsx — Oferta Relâmpago · Sanka Burgers

import { SANKA_BURGERS } from './data.jsx'
import { SANKA_CONFIG }  from './lib/config.js'
import { FoodPlaceholder } from './placeholders.jsx'

const { useState, useEffect } = React;

/* ── Rotação semanal ─────────────────────────────────────────── */
const OFERTA_CODES = ['SB-004','SB-007','SB-012','SB-003','SB-009','SB-015','SB-001'];
const DESCONTO = 0.25;

/* ── Helpers SP ──────────────────────────────────────────────── */
function getSpHour() { return ((new Date().getUTCHours() - 3 + 24) % 24); }
function getSpDow()  { const h = new Date().getUTCHours(), d = new Date().getUTCDay(); return h < 3 ? (d - 1 + 7) % 7 : d; }
function ofertaStatus() { const h = getSpHour(); return h >= 19 && h < 22 ? 'active' : h < 19 ? 'upcoming' : 'ended'; }
function getTargetTs(spH) {
  const t = new Date(); t.setUTCHours((spH + 3) % 24, 0, 0, 0);
  if (t.getTime() <= Date.now()) t.setUTCDate(t.getUTCDate() + 1);
  return t.getTime();
}
function getOfertaRemaining() {
  const d = new Date().toISOString().slice(0, 10);
  try { const s = JSON.parse(localStorage.getItem('sk-oferta') || '{}'); if (s.date !== d) { localStorage.setItem('sk-oferta', JSON.stringify({date:d,n:30})); return 30; } return typeof s.n === 'number' ? s.n : 30; } catch { return 30; }
}
function decrementRemaining() {
  const d = new Date().toISOString().slice(0, 10);
  try { const s = JSON.parse(localStorage.getItem('sk-oferta') || '{}'); const n = s.date === d ? Math.max(0, s.n - 1) : 29; localStorage.setItem('sk-oferta', JSON.stringify({date:d,n})); return n; } catch { return 29; }
}

/* ── Countdown hook ──────────────────────────────────────────── */
function useCountdown(targetTs) {
  const [ms, setMs] = useState(Math.max(0, targetTs - Date.now()));
  useEffect(() => { const iv = setInterval(() => setMs(Math.max(0, targetTs - Date.now())), 1000); return () => clearInterval(iv); }, [targetTs]);
  const s = Math.floor(ms / 1000); const pad = n => String(n).padStart(2, '0');
  return { hh: pad(Math.floor(s / 3600)), mm: pad(Math.floor((s % 3600) / 60)), ss: pad(s % 60), done: ms === 0 };
}

/* ── CountdownDisplay ────────────────────────────────────────── */
function Countdown({ hh, mm, ss, size }) {
  const big = size === 'lg';
  return (
    <div className={`oferta-countdown oferta-countdown--${big ? 'lg' : 'sm'}`}>
      {[{v:hh,u:'h'},{v:mm,u:'m'},{v:ss,u:'s'}].map((item,i,arr) => (
        <React.Fragment key={item.u}>
          <div className="oferta-countdown-block">
            <span className="oferta-countdown-num" aria-live="off">{item.v}</span>
            <span className="oferta-countdown-unit">{item.u}</span>
          </div>
          {i < arr.length - 1 && <span className="oferta-countdown-sep" aria-hidden="true">:</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────── */
function OfertaApp() {
  const [status,    setStatus]    = useState(() => ofertaStatus());
  const [targetTs,  setTargetTs]  = useState(() => {
    const s = ofertaStatus(); return getTargetTs(s === 'active' ? 22 : 19);
  });
  const [remaining, setRemaining] = useState(() => getOfertaRemaining());
  const cd = useCountdown(targetTs);

  useEffect(() => {
    const iv = setInterval(() => {
      const s = ofertaStatus();
      setStatus(s);
      setTargetTs(getTargetTs(s === 'active' ? 22 : 19));
      setRemaining(getOfertaRemaining());
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const burger    = SANKA_BURGERS.find(b => b.code === OFERTA_CODES[getSpDow()]);
  const salePrice = burger ? (burger.price * (1 - DESCONTO)).toFixed(2).replace('.', ',') : '—';
  const origPrice = burger ? burger.price.toFixed(2).replace('.', ',') : '—';
  const pct       = (remaining / 30) * 100;

  function handlePedir() {
    if (!burger || remaining === 0) return;
    const n = decrementRemaining(); setRemaining(n);
    const msg = `Olá! Quero aproveitar a oferta relâmpago! 🍔🔥\n\n*${burger.name}* por R$ ${salePrice} (25% off — só até 22h)`;
    window.open(`https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    if (window.SankaAnalytics) {
      SankaAnalytics.claimOffer({
        code: burger.code,
        name: burger.name,
        originalPrice: Number(origPrice.replace(',', '.')),
        salePrice: Number(salePrice.replace(',', '.')),
      });
    }
  }

  return (
    <>
      <nav className="nav scrolled" style={{position:'sticky',top:0}}>
        <div className="wrap nav-inner">
          <a href="index.html" className="nav-logo" aria-label="Sanka Burgers">
            <div className="nav-logo-mark" aria-hidden="true">S</div>
            <div className="nav-logo-name">SANKA<b>.</b></div>
          </a>
          <span className="nav-page-title">Oferta Relâmpago</span>
          <a href="cardapio.html" className="btn btn-outline btn-sm">Cardápio</a>
        </div>
      </nav>

      <main className="oferta-page-main">
        <div className="wrap">

          {/* ── ATIVA ── */}
          {status === 'active' && burger && (
            <div className="oferta-page-inner">
              <div className="oferta-page-badge" aria-label="Oferta Relâmpago">
                <span aria-hidden="true">🔥</span> OFERTA RELÂMPAGO
              </div>
              <div className="oferta-page-grid">
                <div className="oferta-page-img">
                  <FoodPlaceholder src={burger.src} label={burger.name} tags={burger.tags} eager priority />
                  <div className="oferta-page-discount" aria-label="25% de desconto">-25%</div>
                </div>
                <div className="oferta-page-info">
                  <div className="eyebrow">Só hoje · Das 19h às 22h</div>
                  <h1 className="section-title" style={{fontSize:'clamp(28px,5.5vw,58px)'}}>{burger.name}</h1>
                  <p className="section-sub" style={{marginBottom:20}}>{burger.desc}</p>
                  <div className="oferta-prices oferta-prices--page">
                    <span className="oferta-orig-price">R$ {origPrice}</span>
                    <span className="oferta-sale-price">R$ {salePrice}</span>
                  </div>
                  <p className="oferta-timer-label" style={{marginTop:24}}>Termina em</p>
                  <Countdown hh={cd.hh} mm={cd.mm} ss={cd.ss} size="lg" />
                  <div className="oferta-remaining-wrap" style={{margin:'20px 0 28px'}}>
                    <div className="oferta-remaining-bar">
                      <div className="oferta-remaining-fill" style={{width:`${pct}%`}} aria-hidden="true" />
                    </div>
                    <span className="oferta-remaining-text">{remaining} de 30 restantes hoje</span>
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handlePedir}
                    disabled={remaining === 0}
                    style={{width:'100%',justifyContent:'center'}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {remaining === 0 ? 'ESGOTADO' : 'QUERO ESSA OFERTA'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AGUARDANDO ── */}
          {status === 'upcoming' && (
            <div className="oferta-waiting">
              <div className="oferta-page-badge"><span aria-hidden="true">⏰</span> OFERTA RELÂMPAGO</div>
              <h1 className="section-title" style={{textAlign:'center',fontSize:'clamp(36px,7vw,72px)'}}>
                COMEÇA<br /><em>ÀS 19H</em>
              </h1>
              <p style={{textAlign:'center',color:'var(--ink-dim)',fontSize:15,maxWidth:480,margin:'0 auto 32px'}}>
                Todo dia das 19h às 22h um burger fica com 25% off. Compartilhe esse link.
              </p>
              <p className="oferta-timer-label" style={{textAlign:'center'}}>Começa em</p>
              <Countdown hh={cd.hh} mm={cd.mm} ss={cd.ss} size="lg" />
              {burger && (
                <p style={{textAlign:'center',marginTop:28,fontFamily:'var(--f-m)',fontSize:11,color:'var(--ink-mute)',letterSpacing:'0.14em',textTransform:'uppercase'}}>
                  Hoje: {burger.name} com 25% off
                </p>
              )}
            </div>
          )}

          {/* ── ENCERRADA ── */}
          {status === 'ended' && (
            <div className="oferta-waiting">
              <div className="oferta-page-badge"><span aria-hidden="true">😢</span> ACABOU POR HOJE</div>
              <h1 className="section-title" style={{textAlign:'center',fontSize:'clamp(36px,7vw,72px)'}}>
                VOLTE<br /><em>AMANHÃ.</em>
              </h1>
              <p style={{textAlign:'center',color:'var(--ink-dim)',fontSize:15,maxWidth:480,margin:'0 auto 32px'}}>
                A oferta de hoje encerrou. Amanhã às 19h tem novo burger com 25% off.
              </p>
              <p className="oferta-timer-label" style={{textAlign:'center'}}>Próxima oferta em</p>
              <Countdown hh={cd.hh} mm={cd.mm} ss={cd.ss} size="lg" />
              <div style={{textAlign:'center',marginTop:36}}>
                <a href="cardapio.html" className="btn btn-outline btn-lg">Ver Cardápio Completo</a>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OfertaApp />);
