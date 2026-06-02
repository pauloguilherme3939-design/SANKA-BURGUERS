// analytics.js — GA4 + Meta Pixel + localStorage event tracking
// Carregado como <script> simples. Silencioso se IDs não configurados.

(function () {
  var EVENTS_KEY = 'sanka_analytics_events';

  function ga(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  }
  function pixel(event, params) {
    if (typeof fbq === 'function') fbq('track', event, params || {});
  }
  function pixelCustom(event, params) {
    if (typeof fbq === 'function') fbq('trackCustom', event, params || {});
  }

  function _countEvent(name) {
    try {
      var raw = localStorage.getItem(EVENTS_KEY);
      var counts = raw ? JSON.parse(raw) : {};
      counts[name] = (counts[name] || 0) + 1;
      localStorage.setItem(EVENTS_KEY, JSON.stringify(counts));
    } catch {}
  }

  window.SankaAnalytics = {

    pageView: function () {},

    // Rastreamento genérico — contador localStorage + GA4
    trackEvent: function (name, payload) {
      _countEvent(name);
      ga('sanka_' + name, payload || {});
    },

    // Lê contadores para o painel admin
    getEventCounts: function () {
      try {
        var raw = localStorage.getItem(EVENTS_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
    },

    clearEventCounts: function () {
      try { localStorage.removeItem(EVENTS_KEY); } catch {}
    },

    // ── Eventos específicos ────────────────────────────────────

    waClick: function (origin) {
      _countEvent('wa_click');
      ga('wa_click', { origin: origin || 'unknown' });
    },

    ifoodClick: function (origin) {
      _countEvent('ifood_click');
      ga('ifood_click', { origin: origin || 'unknown' });
    },

    viewCardapio: function (origin) {
      _countEvent('view_cardapio');
      ga('view_cardapio', { origin: origin || 'unknown' });
    },

    couponClick: function (coupon) {
      _countEvent('coupon_click');
      ga('coupon_click', { coupon_code: coupon || '' });
    },

    clubSignup: function (origin) {
      _countEvent('club_signup');
      ga('join_group', { group_id: 'clube_sanka' });
      ga('generate_lead', { currency: 'BRL', value: 0 });
      pixel('Lead', { content_name: 'Clube Sanka' });
    },

    clubLogin: function () {
      _countEvent('club_login');
      ga('login', { method: 'clube_sanka' });
    },

    rewardRedeemed: function (rewardId, points) {
      _countEvent('reward_redeemed');
      ga('reward_redeemed', { reward_id: rewardId || '', points_cost: points || 0 });
    },

    rouletteSpin: function () {
      _countEvent('roulette_spin');
      ga('roulette_spin', {});
      pixelCustom('RouletteSpin', {});
    },

    rouletteWin: function (prizeId, prizeType) {
      _countEvent('roulette_win');
      ga('roulette_win', { prize_id: prizeId || '', prize_type: prizeType || '' });
      pixelCustom('RouletteWin', { content_name: prizeId || '' });
    },

    seoCta: function (page, cta) {
      _countEvent('seo_cta_click');
      ga('seo_cta_click', { page: page || '', cta_label: cta || '' });
    },

    // ── Eventos originais ──────────────────────────────────────

    viewItem: function (item) {
      ga('view_item', {
        items: [{ item_id: item.code, item_name: item.name, price: item.price, currency: 'BRL' }],
      });
    },

    addToCart: function (item) {
      _countEvent('add_to_cart');
      ga('add_to_cart', {
        currency: 'BRL',
        value: item.price,
        items: [{ item_id: item.code, item_name: item.name, price: item.price, quantity: item.qty || 1 }],
      });
      pixel('AddToCart', {
        content_ids: [item.code],
        content_name: item.name,
        value: item.price,
        currency: 'BRL',
      });
    },

    beginCheckout: function (subtotal) {
      _countEvent('begin_checkout');
      ga('begin_checkout', { currency: 'BRL', value: subtotal });
      pixel('InitiateCheckout', { value: subtotal, currency: 'BRL' });
    },

    purchase: function (total) {
      _countEvent('purchase');
      var txId = 'SK-' + Date.now();
      ga('purchase', { transaction_id: txId, currency: 'BRL', value: total });
      pixel('Purchase', { value: total, currency: 'BRL' });
    },

    joinClub: function () {
      _countEvent('club_signup');
      ga('join_group', { group_id: 'clube_sanka' });
      ga('generate_lead', { currency: 'BRL', value: 0 });
      pixel('Lead', { content_name: 'Clube Sanka' });
    },

    buildBurger: function (totalPrice, summary) {
      _countEvent('build_burger');
      ga('build_burger', {
        currency: 'BRL',
        value: totalPrice,
        item_name: summary || 'Burger personalizado',
      });
      pixelCustom('BuildBurger', { value: totalPrice, currency: 'BRL' });
    },

    claimOffer: function (item) {
      _countEvent('claim_offer');
      ga('claim_offer', {
        currency: 'BRL',
        value: item.salePrice,
        items: [{ item_id: item.code, item_name: item.name, price: item.salePrice, currency: 'BRL' }],
        discount: item.originalPrice - item.salePrice,
      });
      pixel('AddToCart', {
        content_ids: [item.code],
        content_name: item.name + ' (Oferta Relâmpago)',
        value: item.salePrice,
        currency: 'BRL',
      });
    },

    trackOrder: function (orderId) {
      ga('track_order', { order_id: orderId });
    },
  };
})();
