// Apenas informação: a criação continua sendo autorizada pelo servidor de pedidos.
const { useEffect, useState } = React;
const FALLBACK = { state: 'unavailable', message: 'Não foi possível confirmar o funcionamento. Tente novamente.' };

export function StoreStatus() {
  const [status, setStatus] = useState({ state: 'pending', message: 'Consultando funcionamento…' });
  useEffect(() => {
    let active = true, sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      let result = FALLBACK;
      try {
        const response = await fetch('/api/funcionamento', { cache: 'no-store' });
        const data = await response.json();
        if (response.ok && ['open', 'closed', 'pending', 'unavailable'].includes(data.state) && typeof data.message === 'string') result = data;
      } catch { /* Sem afirmar que a loja está aberta quando a consulta falha. */ }
      if (active && request === sequence) setStatus(result);
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', refresh); };
  }, []);
  return <p className={`store-status store-status--${status.state}`} role="status" aria-live="polite">{status.message}</p>;
}
