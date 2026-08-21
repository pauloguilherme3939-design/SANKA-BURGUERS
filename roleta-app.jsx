import { getRouletteConfig, spinRoulette } from './lib/roulette-client.mjs'

const { useEffect, useMemo, useState } = React;

const COLORS = ['#292524', '#EA580C', '#C2410C', '#7C2D12', '#D97706', '#A16207'];

function maskPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function wheelGradient(prizes) {
  let cursor = 0;
  return `conic-gradient(${prizes.map((prize, index) => {
    const start = cursor;
    cursor += prize.chancePercent;
    return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`;
  }).join(',')})`;
}

function prizeCenterDegrees(prizes, prizeId) {
  let cursor = 0;
  for (const prize of prizes) {
    const center = cursor + prize.chancePercent / 2;
    if (prize.id === prizeId) return center * 3.6;
    cursor += prize.chancePercent;
  }
  return 0;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function App() {
  const [config, setConfig] = useState(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRouletteConfig()
      .then(setConfig)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const background = useMemo(() => wheelGradient(config?.prizes || []), [config]);

  async function spin() {
    if (spinning) return;
    setError('');
    setResult(null);
    setSpinning(true);
    try {
      const outcome = await spinRoulette(phone);
      const center = prizeCenterDegrees(config.prizes, outcome.prize.id);
      setRotation(value => value + 1440 + (360 - center));
      await new Promise(resolve => setTimeout(resolve, 2200));
      setResult(outcome);
    } catch (err) {
      setError(err.message);
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="rl-page">
      <header className="rl-head">
        <a href="index.html" className="rl-logo">SANKA<span>.</span></a>
        <a href="cardapio.html" className="rl-link">Cardápio</a>
      </header>
      <main className="rl-main">
        <p className="rl-eyebrow">Roleta Sanka</p>
        <h1>GIRO CONTROLADO.<br /><em>PRÊMIO VALIDADO.</em></h1>

        {loading && <p className="rl-muted">Carregando regras…</p>}

        {!loading && config && !config.enabled && (
          <section className="rl-card rl-disabled" role="status">
            <div className="rl-big">🎰</div>
            <h2>EM HOMOLOGAÇÃO</h2>
            <p>A roleta está tecnicamente isolada e ainda não foi liberada para clientes.</p>
          </section>
        )}

        {!loading && config?.enabled && (
          <>
            <section className="rl-wheel-wrap" aria-label="Roleta de benefícios">
              <div className="rl-pointer" aria-hidden="true" />
              <div className="rl-wheel" style={{ background, transform: `rotate(${rotation}deg)` }}>
                <div className="rl-wheel-center">S</div>
              </div>
            </section>

            <section className="rl-card rl-controls">
              <label htmlFor="roulette-phone">Seu telefone</label>
              <input id="roulette-phone" type="tel" inputMode="numeric" autoComplete="tel"
                placeholder="(19) 9 9999-9999" value={phone}
                onChange={event => setPhone(maskPhone(event.target.value))} disabled={spinning} />
              <button onClick={spin} disabled={spinning || phone.replace(/\D/g, '').length < 10}>
                {spinning ? 'GIRANDO…' : 'GIRAR ROLETA'}
              </button>
              <p>1 giro por telefone por dia · benefício válido somente no mesmo dia.</p>
            </section>

            {result && (
              <section className="rl-card rl-result" aria-live="polite">
                <p className="rl-eyebrow">Resultado confirmado pelo servidor</p>
                <h2>{result.prize.label}</h2>
                <p>{result.prize.description}</p>
                {result.code && <code>{result.code}</code>}
                {result.code && <p>Use este código no checkout. Ele só será consumido depois que o pedido for salvo.</p>}
                {result.prize.minimumSubtotal > 0 && <p>Pedido mínimo: {money(result.prize.minimumSubtotal)}.</p>}
              </section>
            )}
          </>
        )}

        {error && <p className="rl-error" role="alert">{error}</p>}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
