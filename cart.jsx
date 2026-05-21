// cart.jsx — Sanka Burgers · Carrinho global + Drawer lateral

import { FoodPlaceholder } from './placeholders.jsx'

const { createContext, useContext, useState, useEffect } = React;

/* ── Context ───────────────────────────────────────────────── */
const CartContext = createContext(null);

function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext fora de CartProvider');
  return ctx;
}

/* ── Provider ──────────────────────────────────────────────── */
function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanka_cart') || '[]'); }
    catch { return []; }
  });
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast,        setToast]        = useState(null);

  // Persistência
  useEffect(() => {
    localStorage.setItem('sanka_cart', JSON.stringify(items));
    window.__sankaCart = items;
  }, [items]);

  // Bloqueia scroll do body quando drawer/checkout abertos
  useEffect(() => {
    document.body.style.overflow = (drawerOpen || checkoutOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen, checkoutOpen]);

  function addItem(item) {
    setItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists
        ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, {
            id:    item.id,
            name:  item.name,
            price: item.price,
            qty:   1,
            obs:   '',
            tags:  item.tags || '',
          }];
    });
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function updateQty(id, qty) {
    if (qty < 1) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }

  function updateObs(id, obs) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, obs } : i));
  }

  function clearCart() {
    setItems([]);
    localStorage.removeItem('sanka_cart');
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const count    = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  const value = {
    items, addItem, removeItem, updateQty, updateObs, clearCart,
    count, subtotal,
    drawerOpen,
    openDrawer:    () => setDrawerOpen(true),
    closeDrawer:   () => setDrawerOpen(false),
    checkoutOpen,
    openCheckout:  () => { setDrawerOpen(false); setCheckoutOpen(true); },
    closeCheckout: () => setCheckoutOpen(false),
    showToast,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <CartToast toast={toast} />
    </CartContext.Provider>
  );
}

/* ── Toast ─────────────────────────────────────────────────── */
function CartToast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`c-toast c-toast--${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success' && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      )}
      <span>{toast.msg}</span>
    </div>
  );
}

/* ── Cart Drawer ───────────────────────────────────────────── */
function CartDrawer() {
  const {
    items, removeItem, updateQty, updateObs,
    count, subtotal,
    drawerOpen, closeDrawer, openCheckout,
  } = useCartContext();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  function brl(n) {
    return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <>
      <div
        className={`drawer-backdrop${drawerOpen ? ' is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${drawerOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
      >
        {/* Cabeçalho */}
        <div className="cart-drawer-head">
          <div>
            <h2 className="cart-drawer-title">Carrinho</h2>
            {count > 0 && (
              <span className="cart-drawer-count">{count} {count === 1 ? 'item' : 'itens'}</span>
            )}
          </div>
          <button className="cart-drawer-close" onClick={closeDrawer} aria-label="Fechar carrinho">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Vazio */}
        {count === 0 && (
          <div className="cart-empty">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.18 }}>
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p>Carrinho vazio</p>
            <button className="btn btn-outline cart-empty-btn" onClick={closeDrawer}>
              Ver cardápio
            </button>
          </div>
        )}

        {/* Lista de itens */}
        {count > 0 && (
          <>
            <div className="cart-items">
              {items.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  brl={brl}
                  onRemove={() => removeItem(item.id)}
                  onQty={(qty) => updateQty(item.id, qty)}
                  onObs={(obs) => updateObs(item.id, obs)}
                />
              ))}
            </div>

            {/* Rodapé */}
            <div className="cart-foot">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <span className="cart-subtotal-val">{brl(subtotal)}</span>
              </div>
              <p className="cart-foot-note">Frete calculado no próximo passo</p>
              <button className="btn btn-primary btn-lg cart-cta" onClick={openCheckout}>
                Finalizar pelo WhatsApp
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ── Cart Item ─────────────────────────────────────────────── */
function CartItem({ item, brl, onRemove, onQty, onObs }) {
  const [showObs, setShowObs] = useState(!!item.obs);

  return (
    <div className="cart-item">
      <div className="cart-item-row">
        {/* Thumb */}
        <div className="cart-item-thumb" aria-hidden="true">
          <FoodPlaceholder tags={item.tags || 'burger,food'} label={item.name} />
        </div>

        {/* Info */}
        <div className="cart-item-info">
          <p className="cart-item-name">{item.name}</p>
          <p className="cart-item-price">{brl(item.price * item.qty)}</p>
          <button
            className="cart-obs-toggle"
            onClick={() => setShowObs(v => !v)}
            type="button"
          >
            {showObs ? '− obs.' : '+ obs.'}
          </button>
        </div>

        {/* Qty + remove */}
        <div className="cart-item-controls">
          <div className="qty-ctrl">
            <button className="qty-btn" onClick={() => onQty(item.qty - 1)} aria-label="Diminuir">−</button>
            <span className="qty-val" aria-label={`Quantidade: ${item.qty}`}>{item.qty}</span>
            <button className="qty-btn" onClick={() => onQty(item.qty + 1)} aria-label="Aumentar">+</button>
          </div>
          <button className="cart-remove" onClick={onRemove} aria-label={`Remover ${item.name}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {showObs && (
        <textarea
          className="cart-obs-field"
          placeholder="Ex: sem cebola, ponto bem passado…"
          value={item.obs}
          onChange={e => onObs(e.target.value)}
          rows={2}
          maxLength={120}
        />
      )}
    </div>
  );
}

export { CartProvider, useCartContext };
