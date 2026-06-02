# ANALYTICS.md — Eventos rastreados · Sanka Burgers

Todos os eventos são disparados pelo arquivo `analytics.js` via `window.SankaAnalytics.*`.
Os eventos chegam simultaneamente no GA4 e no Meta Pixel (onde aplicável).

---

## Como usar nos componentes JSX

```js
// Exemplo em qualquer .jsx
window.SankaAnalytics?.addToCart({ code: item.code, name: item.name, price: item.price })
```

---

## Tabela de eventos

| Método                         | GA4 Event         | Pixel Event          | Quando disparar                                    |
|-------------------------------|-------------------|----------------------|----------------------------------------------------|
| `SankaAnalytics.viewItem()`   | `view_item`       | —                    | Usuário abriu detalhes/hover de um burger          |
| `SankaAnalytics.addToCart()`  | `add_to_cart`     | `AddToCart`          | Clicou em "Adicionar" no cardápio ou oferta        |
| `SankaAnalytics.beginCheckout()` | `begin_checkout` | `InitiateCheckout` | Abriu o modal de checkout                          |
| `SankaAnalytics.purchase()`   | `purchase`        | `Purchase`           | Clicou em "Enviar pedido pelo WhatsApp" ✅ CONVERSÃO |
| `SankaAnalytics.joinClub()`   | `join_group`      | `Lead`               | Formulário do Clube Sanka enviado com sucesso      |
| `SankaAnalytics.buildBurger()` | `build_burger`   | `BuildBurger` (custom) | Clicou em "Adicionar ao pedido" no Monte Seu Burger |
| `SankaAnalytics.claimOffer()` | `claim_offer`     | `AddToCart`          | Clicou em "Quero esse" na Oferta Relâmpago         |
| `SankaAnalytics.trackOrder()` | `track_order`     | —                    | Acessou a página /pedido.html com ID               |

---

## Parâmetros de cada evento

### `viewItem(item)`
```js
item = { code: 'SB-004', name: 'X Provolone ao Mel', price: 28.90 }
```

### `addToCart(item)`
```js
item = { code: 'SB-004', name: 'X Provolone ao Mel', price: 28.90, qty: 1 }
```

### `beginCheckout(subtotal)`
```js
subtotal = 57.80  // valor numérico do carrinho
```

### `purchase(total)`
```js
total = 63.80  // subtotal + entrega
```
> Dispara com transaction_id único `SK-{timestamp}`.

### `joinClub()`
Sem parâmetros.

### `buildBurger(totalPrice, summary)`
```js
totalPrice = 36.00
summary = 'Brioche + Blend 150g + Provolone + Bacon + Barbecue'
```

### `claimOffer(item)`
```js
item = { code: 'SB-007', name: 'X Bacon', originalPrice: 27.90, salePrice: 20.93 }
```

### `trackOrder(orderId)`
```js
orderId = 'ABC123'
```

---

## Configuração antes do lançamento

1. **Google Analytics 4**: Criar conta GA4 → Propriedade → Data Stream Web → copiar Measurement ID (`G-XXXXXXXXXX`)
2. Substituir `G-XXXXXXXXXX` em: `index.html`, `cardapio.html`, `nossa-carne.html`, `cardapio.html`
3. **Meta Pixel**: Meta Business Suite → Events Manager → Conectar fontes de dados → Pixel → copiar ID
4. Substituir `XXXXXXXXXXXXXXXXXX` nos mesmos HTMLs
5. Testar com [GA4 DebugView](https://analytics.google.com) e [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper)

---

## Conversão principal

O evento `purchase` (clique no WhatsApp) é **a conversão mais importante**.
Configure no GA4: Admin → Conversions → New conversion event → `purchase`
Configure no Pixel: Events Manager → Test Events → verificar `Purchase`
