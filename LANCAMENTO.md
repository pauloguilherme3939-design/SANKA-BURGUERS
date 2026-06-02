# LANCAMENTO.md — Checklist de lançamento · Sanka Burgers

Use esta lista antes de divulgar o site ao público.
Marque cada item com `[x]` conforme concluir.

---

## ETAPA 1 — Infraestrutura

- [ ] Domínio `sankaburgers.com.br` (ou variação) comprado no Registro.br
- [ ] DNS apontando para Vercel (adicionar domínio em Vercel → Settings → Domains)
- [ ] HTTPS ativo (automático no Vercel após DNS propagar — aguardar até 48h)

---

## ETAPA 2 — Variáveis de ambiente no Vercel

No Vercel → Settings → Environment Variables:

- [ ] `ADMIN_PASSWORD` — senha forte para o painel admin (min. 12 chars)
- [ ] `BLOB_READ_WRITE_TOKEN` — token do Vercel Blob (Storage → Create store → copiar token)

Variáveis opcionais (ativar analytics):
- [ ] GA4 ID substituído em todos os HTMLs: `index.html`, `cardapio.html`, `nossa-carne.html`
- [ ] Meta Pixel ID substituído nos mesmos HTMLs

---

## ETAPA 3 — Conteúdo real (TODO: SANKA)

Substitua todos os blocos `TODO: SANKA` no código:

- [ ] `index.html` → JSON-LD: endereço real, CEP, telefone, horários, link Instagram, link iFood, nº de avaliações
- [ ] `nossa-carne-app.jsx` → nome da padaria parceira (seção "O pão")
- [ ] `nossa-carne.html` + outros HTMLs → og:image (foto real salva em `/og/`)
- [ ] `lib/config.js` → confirmar número WhatsApp correto (`5516993138450`)

---

## ETAPA 4 — Conteúdo de imagens

- [ ] OG images criadas (1200×630px) e salvas em `/og/`:
  - `/og/home.jpg` — foto do burger assinatura + logo sobreposto
  - `/og/cardapio.jpg` — grid de burgers ou foto de destaque
  - `/og/nossa-carne.jpg` — foto da carne sendo moída
  - `/og/monte.jpg` — pode ser a mesma do cardápio
- [ ] Ícone SVG da marca em `icons/icon.svg` (marca vetorizada; o build gera os PNGs automaticamente)
- [ ] Todas as fotos de burger em `/assets/burgers/` (SB-001 a SB-017 — já estão)

---

## ETAPA 5 — Presença digital

- [ ] **Google Meu Negócio** verificado e com link do site atualizado
- [ ] **Instagram** com no mínimo 9 posts antes do lançamento (fotos dos burgers, bastidores)
- [ ] **WhatsApp Business** configurado:
  - Mensagem de ausência (fora do horário)
  - Catálogo com os burgers principais
  - Número testado como link direto `wa.me/5516993138450`
- [ ] **iFood**: loja verificada, cardápio atualizado com mesmas fotos, link do site no perfil

---

## ETAPA 6 — Teste completo antes do go-live

- [ ] **Fluxo principal**: home → cardápio → adicionar item → checkout → mensagem WhatsApp recebida corretamente
- [ ] **Monte seu Burger**: pão → carne → queijo → toppings → molho → adicionar → WhatsApp com resumo
- [ ] **Oferta Relâmpago**: forcear horário 19h-22h (alterar `getSpHour()` temporariamente) → verificar card e countdown → "Quero esse" funciona
- [ ] **Rastreamento de pedido**: criar pedido pelo checkout → copiar link → abrir `/pedido.html?id=XXXXX` → mudar status no admin → verificar atualização
- [ ] **Clube Sanka**: preencher formulário → verificar que aparece em `/admin-clube.html`
- [ ] **Admin de pedidos**: acessar `/admin-pedidos.html` com senha → criar pedido de teste → avançar status

---

## ETAPA 7 — Performance e qualidade

- [ ] Lighthouse **Performance > 85** na home (mobile)
- [ ] Lighthouse **SEO = 100** na home
- [ ] Lighthouse **Accessibility > 90** na home
- [ ] **Sem scroll horizontal** em nenhuma página (testar em iPhone SE — 375px)
- [ ] Testar em Android (Chrome) e iOS (Safari)
- [ ] Testar em 3G lento (Chrome DevTools → Network → Slow 3G)

---

## ETAPA 8 — Backup

- [ ] Repositório no GitHub com todos os arquivos (exceto `/dist/` e `/node_modules/`)
- [ ] Dados do Clube (`data/clube.json`) incluídos no `.gitignore` ou em Vercel Blob (produção)
- [ ] `.env` **não commitado** — variáveis somente no Vercel

---

## Após o lançamento (primeiros 7 dias)

- [ ] Postar sobre o site no Instagram (stories + feed)
- [ ] Enviar link pro WhatsApp de clientes recorrentes
- [ ] Verificar GA4: acessos, tempo médio, eventos `add_to_cart` e `purchase`
- [ ] Verificar Meta Pixel: `Purchase` disparando
- [ ] Corrigir qualquer bug reportado em < 24h
- [ ] Adicionar avaliações reais de clientes nas seções de depoimento (`sections.jsx`)

---

_Última atualização: gerado automaticamente pelo Claude Code_
