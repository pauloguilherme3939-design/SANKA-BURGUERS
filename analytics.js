// analytics.js — GA4 + Meta Pixel event helpers
// Carregado como <script> simples (sem Babel). Guarda silêncio se os IDs ainda não foram configurados.

(function () {
  function ga(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  }

  function pixel(event, params) {
    if (typeof fbq === 'function') fbq('track', event, params || {});
  }

  function pixelCustom(event, params) {
    if (typeof fbq === 'function') fbq('trackCustom', event, params || {});
  }

  window.SankaAnalytics = {

    // Disparado automaticamente pelos snippets GA4/Pixel no <head>
    pageView: function () {},

    // Cardápio: usuário visualizou detalhes de um burger
    viewItem: function (item) {
      ga('view_item', {
        items: [{ item_id: item.code, item_name: item.name, price: item.price, currency: 'BRL' }],
      });
    },

    // Cardápio: adicionou item ao carrinho
    addToCart: function (item) {
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

    // Checkout: abriu o modal de checkout
    beginCheckout: function (subtotal) {
      ga('begin_checkout', { currency: 'BRL', value: subtotal });
      pixel('InitiateCheckout', { value: subtotal, currency: 'BRL' });
    },

    // Checkout: clicou em "Enviar pedido pelo WhatsApp" — conversão principal
    purchase: function (total) {
      var txId = 'SK-' + Date.now();
      ga('purchase', { transaction_id: txId, currency: 'BRL', value: total });
      pixel('Purchase', { value: total, currency: 'BRL' });
    },

    // Clube: usuário entrou no Clube Sanka
    joinClub: function () {
      ga('join_group', { group_id: 'clube_sanka' });
      ga('generate_lead', { currency: 'BRL', value: 0 });
      pixel('Lead', { content_name: 'Clube Sanka' });
    },

    // Monte seu Burger: usuário concluiu a montagem e clicou em "Adicionar ao pedido"
    buildBurger: function (totalPrice, summary) {
      ga('build_burger', {
        currency: 'BRL',
        value: totalPrice,
        item_name: summary || 'Burger personalizado',
      });
      pixelCustom('BuildBurger', { value: totalPrice, currency: 'BRL' });
    },

    // Oferta relâmpago: usuário clicou em "Quero esse" na oferta
    claimOffer: function (item) {
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

    // Rastreamento: usuário acessou a página de status do pedido
    trackOrder: function (orderId) {
      ga('track_order', { order_id: orderId });
    },
  };
})();
