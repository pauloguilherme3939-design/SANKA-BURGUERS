# Estratégia de Crescimento Local — Sanka Burgers

## Objetivo

Transformar o site em uma máquina de aquisição e retenção local, combinando:
- **SEO local** (Google Maps, buscas "hamburgueria Rio Claro")
- **Retenção via Clube** (pontos, roleta, upgrades de tier)
- **Crescimento orgânico** (boca a boca facilitado, avaliações, redes sociais)

---

## Funil de conversão

```
Descoberta (SEO / Maps / WA indicação)
    ↓
Visita ao site → Cardápio → WA click → Pedido
    ↓
Cupom SANKA10 na primeira compra
    ↓
Cadastro no Clube Sanka (pontos automáticos)
    ↓
Giro na roleta → prêmio → próximo pedido
    ↓
Streak de pedidos → Upgrade de tier → Prêmios maiores
    ↓
Avaliação Google → Novos visitantes no Maps
```

---

## Alavancas prioritárias (em ordem de ROI)

### 1. Google Business Profile
Impacto mais alto, custo zero.
- Perfil verificado = aparece no Google Maps para "hamburgueria Rio Claro"
- 10+ avaliações com 4.5+ estrelas → ativa prova social no site
- Ver `docs/SEO_LOCAL_CHECKLIST.md`

### 2. Clube Sanka + Roleta
Diferencial competitivo já implementado.
- Cada cadastro = lead capturado (nome + WhatsApp)
- Roleta cria razão para voltar semanalmente
- Ativar `rouletteMode: 'active'` quando homologado

### 3. WhatsApp como CRM
Já é o canal principal de pedidos — usar melhor.
- Salvar número do cliente no momento do pedido (manual por enquanto)
- Lembrete de "cupom vencendo" por WA (future feature)
- Divulgação de oferta relâmpago para lista de transmissão

### 4. SEO de conteúdo local
Páginas já criadas para termos de cauda longa:
- "hamburgueria em Rio Claro"
- "delivery hamburgueria Rio Claro"
- "lanche prensado Rio Claro"
- "hambúrguer grande Rio Claro"

Manter atualizado; adicionar novas páginas conforme necessidade.

---

## Métricas para acompanhar

| Métrica | Ferramenta | Meta |
|---------|-----------|------|
| wa_click | Admin → Métricas | Aumentar M/M |
| club_signup | Admin → Métricas | > 20% dos pedidores |
| roulette_spin | Admin → Métricas | Taxa de engajamento |
| Avaliações Google | GBP | ≥ 4.5 estrelas |
| Posição no Maps | GBP Insights | Top 3 "hamburgueria Rio Claro" |
| Taxa de retorno | Admin → Membros (pedidos > 1) | > 40% |

---

## Recursos do sistema de rastreamento

### `analytics.js`
Todos os cliques relevantes são rastreados automaticamente:
- `wa_click(origin)` — qual botão WA foi clicado
- `view_cardapio(origin)` — acesso ao cardápio
- `coupon_click(code)` — uso do cupom SANKA10
- `club_signup(origin)` — cadastro no Clube
- `roulette_spin/win` — engajamento na roleta
- `seo_cta_click(page, cta)` — conversão de páginas SEO

Ver resultados em: `admin-clube.html` → aba **Métricas**.

### A/B test no Hero
Controle via `lib/brand.js → heroVariant`:
- `'A'` — "O LANCHÃO PRENSADO QUE CHEGOU PESADO" (atual default)
- `'B'` — "FOME DE RESPEITO? A SANKA RESOLVE."
- `'C'` — "RIO CLARO TEM UM NOVO LANCHÃO."

Trocar o valor e comparar `wa_click` e `view_cardapio` por variante.

---

## Roadmap de crescimento

### Fase 1 — Base (agora)
- [x] Site com SEO local
- [x] Clube Sanka + Roleta
- [x] Rastreamento de eventos
- [ ] Google Business Profile verificado
- [ ] 10+ avaliações reais

### Fase 2 — Engajamento
- [ ] WhatsApp API oficial (envio automático de lembretes de roleta)
- [ ] Notificações push para membros do Clube
- [ ] Oferta de aniversário automatizada

### Fase 3 — Escala
- [ ] App mobile nativo
- [ ] iFood integrado com Clube (pontos duplos iFood)
- [ ] Relatório MEI automatizado

---

## Notas de operação

- Nunca ativar `rouletteMode: 'active'` sem homologação jurídica dos termos do Clube
- Nunca colocar `gaMeasurementId` ou `metaPixelId` falsos — preencher apenas quando tiver IDs reais
- Atualizar `SANKA_BRAND.googleMapsUrl` assim que o perfil GBP for criado
- Ativar `isGoogleRatingActive: true` somente após atingir avaliações reais (evita prova social falsa)
