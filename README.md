# Sanka Burgers — Site

Site completo da hamburgueria Sanka Burgers (Rio Claro/SP).
Stack: Express + React 18 (CDN) + esbuild + Tailwind Play CDN + Vercel Blob.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`.

O comando `dev` roda o esbuild em modo watch (recompila JSX ao salvar) e o servidor Express simultaneamente.

---

## Fazer build de produção

```bash
npm run build
```

Gera os bundles minificados em `/dist/`, as imagens WebP em `/assets/*/` e os ícones PNG em `/icons/`.

---

## Adicionar um burger novo

1. Abra `data.jsx`
2. Adicione um objeto no array `SANKA_BURGERS`:

```js
{
  name: "Nome do Burger",
  cat: "classicos",          // classicos | queijos | carnes | frango | vegetal
  code: "SB-018",            // próximo na sequência
  desc: "Descrição curta.",
  price: 29.90,
  tag: null,                 // null | "ASSINATURA" | "FAVORITO" | "NOVO"
  tags: "burger,cheese",     // palavras-chave separadas por vírgula (para fallback placeholder)
  src: "/assets/burgers/sb-018.png",
}
```

3. Coloque a foto em `/assets/burgers/sb-018.png` (1:1, mínimo 600×600px)
4. Rode `npm run build` — o WebP é gerado automaticamente

---

## Atualizar status de um pedido (admin na cozinha)

Acesse `http://localhost:3000/admin-pedidos.html` (em produção: `sankaburgers.com.br/admin-pedidos.html`)

A senha é a variável `ADMIN_PASSWORD` do `.env`.

Statuses possíveis (nessa ordem):
`recebido` → `preparando` → `na_chapa` → `finalizando` → `saiu_entrega` → `entregue`

---

## Mudar a oferta relâmpago

Edite o array `OFERTA_CODES` em `oferta-app.jsx`:

```js
// Um code por dia da semana: [Dom, Seg, Ter, Qua, Qui, Sex, Sáb]
const OFERTA_CODES = ['SB-004','SB-007','SB-012','SB-003','SB-009','SB-015','SB-001']
```

O desconto é de 25% (`const DESCONTO = 0.25`) — altere nessa mesma linha se quiser outro percentual.

---

## Exportar lista do Clube Sanka

```bash
curl "http://localhost:3000/api/clube/members?password=SUASENHA"
```

Retorna JSON com todos os membros. Para exportar CSV, cole o JSON em [json-csv.com](https://json-csv.com).

Em produção, autentique com a senha real do `.env`.

---

## Variáveis de ambiente (.env)

Crie um arquivo `.env` na raiz (não comitar):

```
ADMIN_PASSWORD=senha-forte-aqui
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxx   # opcional, para produção com Vercel Blob
```

---

## Deploy (Vercel)

O `vercel.json` já está configurado. O deploy é automático via GitHub:

1. `git add .`
2. `git commit -m "feat: descrição"`
3. `git push`

O Vercel roda `npm run build` automaticamente antes de publicar.

Variáveis de ambiente no Vercel: Settings → Environment Variables → adicionar `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, etc.

---

## Estrutura de arquivos

```
index.html / cardapio.html / monte.html
nossa-carne.html / oferta.html / pedido.html
admin-clube.html / admin-pedidos.html

app.jsx             → App root da home
cardapio-app.jsx    → App do cardápio + carrinho
monte-app.jsx       → Builder de burger
oferta-app.jsx      → Oferta relâmpago
pedido-app.jsx      → Rastreamento de pedido
admin-clube-app.jsx → Admin do Clube
admin-pedidos-app.jsx → Admin de pedidos

sections.jsx        → Todas as seções da home
data.jsx            → Dados do cardápio (burgers, combos, bebidas, etc.)
cart.jsx            → Lógica do carrinho
checkout-modal.jsx  → Modal de checkout
clube-modal.jsx     → Modal do Clube Sanka
placeholders.jsx    → Componentes de imagem com fallback

server.js           → Express + API /api/clube
api/pedido.js       → Serverless function (rastreamento)
lib/config.js       → WhatsApp, taxa de entrega, cupons
analytics.js        → GA4 + Meta Pixel helpers
build.mjs           → esbuild + sharp (WebP + ícones PWA)

assets/burgers/     → Fotos dos burgers (PNG + WebP gerado no build)
icons/              → Ícones PWA (SVG fonte + PNGs gerados no build)
dist/               → Bundles JS gerados (não commitar)
```
