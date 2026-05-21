// analytics.js — GA4 + Meta Pixel event helpers
// Carregado como <script> simples (sem Babel). Guarda silêncio se os IDs ainda não foram configurados.

(function () {
  function ga(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  }

  function pixel(event, params) {
    if (typeof fbq === 'function') fbq('track', event, params || {});
  }

  window.SankaAnalytics = {
    pageView: function () {
      // GA4 dispara automaticamente; pixel dispara no snippet. Nada extra.
    },

    viewItem: function (item) {
      ga('view_item', {
        items: [{ item_id: item.code, item_name: item.name, price: item.price, currency: 'BRL' }],
      });
    },

    addToCart: function (item) {
      ga('add_to_cart', {
        currency: 'BRL',
        value: item.price,
        items: [{ item_id: item.code, item_name: item.name, price: item.price, quantity: 1 }],
      });
      pixel('AddToCart', {
        content_ids: [item.code],
        content_name: item.name,
        value: item.price,
        currency: 'BRL',
      });
    },

    beginCheckout: function (subtotal) {
      ga('begin_checkout', { currency: 'BRL', value: subtotal });
      pixel('InitiateCheckout', { value: subtotal, currency: 'BRL' });
    },

    purchase: function (total) {
      var txId = 'SK-' + Date.now();
      ga('purchase', { transaction_id: txId, currency: 'BRL', value: total });
      pixel('Purchase', { value: total, currency: 'BRL' });
    },

    joinClub: function () {
      ga('join_group', { group_id: 'clube_sanka' });
      ga('generate_lead', { currency: 'BRL', value: 0 });
      pixel('Lead', { content_name: 'Clube Sanka' });
    },
  };
})();
