// checkout-modal.jsx — Sanka Burgers · Formulário de fechamento do pedido

import { SANKA_CONFIG } from './lib/config.js'
import { useCartContext } from './cart.jsx'

const { useState, useEffect } = React;

/* ── Utilitários ───────────────────────────────────────────── */
function brl(n) {
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function maskPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function maskCep(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

/* ── Monta mensagem WA ─────────────────────────────────────── */
function buildWAMessage({ items, form, subtotal, discount, deliveryFee, total }) {
  const ln = (s) => s;
  const lines = [
    '*🍔 PEDIDO SANKA BURGERS*',
    '',
    `*Cliente:* ${form.name}`,
    `*Telefone:* ${form.phone}`,
    '---',
  ];

  items.forEach(item => {
    lines.push(`${item.qty}× ${item.name} — ${brl(item.price * item.qty)}`);
    if (item.obs) lines.push(`  _Obs: ${item.obs}_`);
  });

  lines.push('---');
  lines.push(`Subtotal: ${brl(subtotal)}`);
  if (discount > 0) lines.push(`Desconto (${form.coupon}): -${brl(discount)}`);

  const entregaLabel = form.delivery === 'delivery'
    ? (deliveryFee === 0 ? 'Entrega: Grátis 🎉' : `Entrega: ${brl(deliveryFee)}`)
    : 'Entrega: Retirada no local';
  lines.push(entregaLabel);

  lines.push(`*TOTAL: ${brl(total)}*`);

  const pagLabel = form.payment === 'pix'  ? 'Pix'
    : form.payment === 'card' ? 'Cartão na entrega'
    : `Dinheiro${form.change ? ` (troco: ${form.change})` : ''}`;
  lines.push(`Pagamento: ${pagLabel}`);

  if (form.delivery === 'delivery') {
    lines.push('');
    lines.push(`*Endereço:* ${form.street}, ${form.number}${form.complement ? ` — ${form.complement}` : ''}`);
    lines.push(`${form.neighborhood} · CEP ${form.cep}`);
  }

  return lines.join('\n');
}

/* ── Checkout Modal ────────────────────────────────────────── */
function CheckoutModal() {
  const {
    items, subtotal, checkoutOpen, closeCheckout, clearCart, showToast,
  } = useCartContext();

  const INITIAL_FORM = {
    name: '', phone: '', delivery: 'pickup',
    cep: '', street: '', number: '', complement: '', neighborhood: '',
    payment: 'pix', change: '', coupon: '',
  };

  const [form,         setForm]         = useState(INITIAL_FORM);
  const [errors,       setErrors]       = useState({});
  const [couponState,  setCouponState]  = useState(null); // { valid, discount, label }
  const [cepLoading,   setCepLoading]   = useState(false);

  // Resetar form ao fechar
  useEffect(() => {
    if (!checkoutOpen) { setForm(INITIAL_FORM); setErrors({}); setCouponState(null); }
  }, [checkoutOpen]);

  // Disparar begin_checkout ao abrir (subtotal capturado no momento da abertura)
  useEffect(() => {
    if (checkoutOpen && window.SankaAnalytics) SankaAnalytics.beginCheckout(subtotal);
  }, [checkoutOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fechar com Escape
  useEffect(() => {
    if (!checkoutOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeCheckout(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkoutOpen]);

  function field(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  }

  // ViaCEP
  async function fetchCep(cepRaw) {
    const c = cepRaw.replace(/\D/g, '');
    if (c.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(f => ({
          ...f,
          street:       d.logradouro || f.street,
          neighborhood: d.bairro     || f.neighborhood,
        }));
      }
    } catch {}
    finally { setCepLoading(false); }
  }

  // Cupom
  function applyCoupon() {
    const code = form.coupon.trim().toUpperCase();
    const cfg  = SANKA_CONFIG.coupons[code];
    if (!cfg) {
      setCouponState({ valid: false });
    } else {
      const disc = cfg.type === 'percent'
        ? subtotal * (cfg.value / 100)
        : cfg.value;
      setCouponState({ valid: true, discount: disc, label: cfg.label });
    }
  }

  // Cálculos
  const discount    = couponState?.valid ? (couponState.discount || 0) : 0;
  const deliveryFee = form.delivery === 'delivery'
    ? ((subtotal - discount) >= SANKA_CONFIG.freeDeliveryAbove ? 0 : SANKA_CONFIG.deliveryFee)
    : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  // Validação
  function validate() {
    const e = {};
    if (!form.name.trim())                          e.name  = 'Nome obrigatório';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido';
    if (form.delivery === 'delivery') {
      if (form.cep.replace(/\D/g,'').length !== 8) e.cep    = 'CEP inválido';
      if (!form.street.trim())                     e.street = 'Rua obrigatória';
      if (!form.number.trim())                     e.number = 'Número obrigatório';
    }
    if (form.payment === 'cash' && !form.change.trim()) e.change = 'Informe o valor para troco';
    return e;
  }

  function makeLocalId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    // Gera ID de rastreamento antes de abrir WA (sem async — evita popup blocker)
    const orderId   = makeLocalId();
    const trackUrl  = `${window.location.origin}/pedido.html?id=${orderId}`;
    const msgWithId = buildWAMessage({ items, form, subtotal, discount, deliveryFee, total })
      + `\n\n📍 Rastreie seu pedido: ${trackUrl}`;
    const waUrl = `https://wa.me/${SANKA_CONFIG.whatsapp}?text=${encodeURIComponent(msgWithId)}`;

    // Abre WA imediatamente (deve ser síncrono para não ser bloqueado)
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Copia link de rastreamento para o clipboard
    navigator.clipboard?.writeText(trackUrl).catch(() => {});

    // Cria o pedido na API em background
    fetch('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:    orderId,
        name:  form.name,
        phone: form.phone,
        items: items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total,
      }),
    }).catch(() => {}); // falha silenciosa — rastreamento é best-effort

    if (window.SankaAnalytics) SankaAnalytics.purchase(total);
    clearCart();
    closeCheckout();
    showToast(`Pedido enviado! 🍔 Link de rastreamento copiado.`);
  }

  if (!checkoutOpen) return null;

  const FI = ({ id, label, required, error, children }) => (
    <div className="co-field">
      <label className="co-label" htmlFor={id}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && <span className="co-error" role="alert">{error}</span>}
    </div>
  );

  return (
    <div className="co-overlay" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
      <div className="co-backdrop" onClick={closeCheckout} aria-hidden="true" />

      <div className="co-panel">

        {/* Header */}
        <div className="co-head">
          <button className="co-back" onClick={closeCheckout} aria-label="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Voltar
          </button>
          <h2 className="co-title">Finalizar Pedido</h2>
          <div style={{ width: 80 }} />
        </div>

        <div className="co-body">

          {/* ── Formulário ── */}
          <div className="co-form-col">

            {/* Identificação */}
            <fieldset className="co-section">
              <legend className="co-section-title">Identificação</legend>

              <FI id="co-name" label="Nome" required error={errors.name}>
                <input id="co-name" className={`co-input${errors.name ? ' is-err' : ''}`}
                  type="text" autoComplete="name" placeholder="Seu nome"
                  value={form.name} onChange={e => field('name', e.target.value)} />
              </FI>

              <FI id="co-phone" label="Telefone" required error={errors.phone}>
                <input id="co-phone" className={`co-input${errors.phone ? ' is-err' : ''}`}
                  type="tel" inputMode="numeric" autoComplete="tel" placeholder="(19) 9 9999-9999"
                  value={form.phone} onChange={e => field('phone', maskPhone(e.target.value))} />
              </FI>
            </fieldset>

            {/* Entrega */}
            <fieldset className="co-section">
              <legend className="co-section-title">Forma de entrega</legend>

              <div className="co-delivery-opts">
                {[
                  { val: 'pickup',   label: 'Retirada',  sub: 'Grátis',           icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
                  { val: 'delivery', label: 'Delivery',  sub: brl(SANKA_CONFIG.deliveryFee), icon: 'M1 3h15v13H1z M16 8l4 0 3 3v5h-7V8z M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
                ].map(o => (
                  <label key={o.val} className={`co-delivery-opt${form.delivery === o.val ? ' is-active' : ''}`}>
                    <input type="radio" name="delivery" value={o.val}
                      checked={form.delivery === o.val}
                      onChange={() => field('delivery', o.val)}
                      className="sr-only" />
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {o.icon.split(' M').map((p, i) => <path key={i} d={i === 0 ? p : 'M' + p} />)}
                    </svg>
                    <span className="co-delivery-label">{o.label}</span>
                    <span className="co-delivery-sub">{o.sub}</span>
                  </label>
                ))}
              </div>

              {form.delivery === 'delivery' && (
                <div className="co-address">
                  <FI id="co-cep" label="CEP" required error={errors.cep}>
                    <div className="co-cep-wrap">
                      <input id="co-cep" className={`co-input${errors.cep ? ' is-err' : ''}`}
                        type="text" inputMode="numeric" placeholder="00000-000" maxLength={9}
                        value={form.cep}
                        onChange={e => {
                          const v = maskCep(e.target.value);
                          field('cep', v);
                          if (v.replace(/\D/g,'').length === 8) fetchCep(v);
                        }} />
                      {cepLoading && <span className="co-cep-spin">…</span>}
                    </div>
                  </FI>

                  <div className="co-row">
                    <FI id="co-street" label="Rua" required error={errors.street}>
                      <input id="co-street" className={`co-input${errors.street ? ' is-err' : ''}`}
                        type="text" placeholder="Rua, Avenida…"
                        value={form.street} onChange={e => field('street', e.target.value)} />
                    </FI>
                    <FI id="co-number" label="Número" required error={errors.number}>
                      <input id="co-number" className={`co-input${errors.number ? ' is-err' : ''}`}
                        type="text" placeholder="42" style={{ maxWidth: 96 }}
                        value={form.number} onChange={e => field('number', e.target.value)} />
                    </FI>
                  </div>

                  <div className="co-row">
                    <FI id="co-complement" label="Complemento">
                      <input id="co-complement" className="co-input"
                        type="text" placeholder="Apto, bloco…"
                        value={form.complement} onChange={e => field('complement', e.target.value)} />
                    </FI>
                    <FI id="co-neighborhood" label="Bairro">
                      <input id="co-neighborhood" className="co-input"
                        type="text" placeholder="Bairro"
                        value={form.neighborhood} onChange={e => field('neighborhood', e.target.value)} />
                    </FI>
                  </div>
                </div>
              )}
            </fieldset>

            {/* Pagamento */}
            <fieldset className="co-section">
              <legend className="co-section-title">Pagamento</legend>
              <div className="co-payment-opts">
                {[
                  { val: 'pix',  label: 'Pix' },
                  { val: 'card', label: 'Cartão na entrega' },
                  { val: 'cash', label: 'Dinheiro' },
                ].map(o => (
                  <label key={o.val} className={`co-payment-opt${form.payment === o.val ? ' is-active' : ''}`}>
                    <input type="radio" name="payment" value={o.val}
                      checked={form.payment === o.val}
                      onChange={() => field('payment', o.val)}
                      className="sr-only" />
                    {o.label}
                  </label>
                ))}
              </div>

              {form.payment === 'cash' && (
                <FI id="co-change" label="Troco para" required error={errors.change}>
                  <input id="co-change" className={`co-input${errors.change ? ' is-err' : ''}`}
                    type="text" placeholder="R$ 50,00"
                    value={form.change} onChange={e => field('change', e.target.value)} />
                </FI>
              )}
            </fieldset>

            {/* Cupom */}
            <div className="co-coupon">
              <div className="co-coupon-row">
                <input className="co-input" type="text" placeholder="Cupom de desconto"
                  value={form.coupon}
                  onChange={e => { field('coupon', e.target.value.toUpperCase()); setCouponState(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') applyCoupon(); }} />
                <button className="btn btn-outline co-coupon-btn" type="button" onClick={applyCoupon}>
                  Aplicar
                </button>
              </div>
              {couponState !== null && (
                <p className={`co-coupon-msg${couponState.valid ? ' is-ok' : ' is-fail'}`}>
                  {couponState.valid ? `✓ ${couponState.label}` : '✗ Cupom inválido ou expirado'}
                </p>
              )}
            </div>

          </div>

          {/* ── Resumo ── */}
          <div className="co-summary-col">
            <div className="co-summary">
              <h3 className="co-summary-title">Resumo</h3>

              <div className="co-summary-items">
                {items.map(item => (
                  <div key={item.id} className="co-summary-row">
                    <span className="co-summary-qty">{item.qty}×</span>
                    <span className="co-summary-name">{item.name}</span>
                    <span className="co-summary-price">{brl(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="co-totals">
                <div className="co-total-row">
                  <span>Subtotal</span><span>{brl(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="co-total-row co-total-row--disc">
                    <span>Desconto</span><span>−{brl(discount)}</span>
                  </div>
                )}
                <div className="co-total-row">
                  <span>Entrega</span>
                  <span>
                    {form.delivery === 'pickup' ? 'Retirada'
                      : deliveryFee === 0 ? 'Grátis 🎉'
                      : brl(deliveryFee)}
                  </span>
                </div>
                <div className="co-total-row co-total-row--total">
                  <span>Total</span><span>{brl(total)}</span>
                </div>
              </div>

              <button className="btn btn-primary btn-lg co-submit" onClick={handleSubmit}>
                Enviar Pedido pelo WhatsApp
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <p className="co-submit-note">
                O WhatsApp da loja abre com o pedido pronto. A equipe confirma em instantes.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export { CheckoutModal };
