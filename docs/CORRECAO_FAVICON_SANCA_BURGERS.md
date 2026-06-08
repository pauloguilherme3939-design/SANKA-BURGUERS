# Correção do Favicon — Sanca Burgers

**Data:** 08 de junho de 2026
**Motivo:** Site sem favicon próprio nas abas do navegador e sem apple-touch-icon funcional (SVG não é suportado pelo iOS)

---

## Auditoria dos arquivos existentes

| Arquivo | Status antes |
|---------|-------------|
| `favicon.ico` (raiz) | **Ausente** |
| `favicon-48x48.png` (raiz) | **Ausente** |
| `favicon-96x96.png` (raiz) | **Ausente** |
| `icon-192.png` (raiz) | **Ausente** |
| `icon-512.png` (raiz) | **Ausente** |
| `apple-touch-icon.png` (raiz) | **Ausente** |
| `site.webmanifest` | **Ausente** (projeto usava `manifest.json`) |
| `icons/icon.svg` | **Presente** — SVG da marca (fundo preto + "S" gradiente laranja) |
| `icons/icon-192.png` | **Presente** — ícone real 192×192 |
| `icons/icon-512.png` | **Presente** — ícone real 512×512 |
| `icons/icon-maskable.png` | **Presente** — maskable 512×512 |
| `LOGO/logo 1.png` | **Presente** — logo full 1254×1254 |
| `<link rel="icon">` em HTMLs | **Ausente** em todos os 17 HTMLs |
| `<link rel="apple-touch-icon" href="/icons/icon.svg">` | **Presente (errado)** — iOS não suporta SVG |

---

## Logo base utilizado

**`icons/icon-512.png`** — ícone real da marca, 512×512:
- Fundo: `#0A0A0A` (preto)
- Letra: `S` com gradiente laranja `#E05516` → `#8A2E08`
- Borda arredondada (rx=96 em viewBox 512)

---

## Arquivos criados na raiz do projeto

| Arquivo | Dimensão | Finalidade |
|---------|----------|-----------|
| `favicon.ico` | 16+32+48 multi-size | Google, navegadores legados |
| `favicon-48x48.png` | 48×48 | Aba de navegador / atalho |
| `favicon-96x96.png` | 96×96 | Alta resolução |
| `apple-touch-icon.png` | 180×180 | Homescreen iOS/Safari |
| `icon-192.png` | 192×192 | PWA manifest (URL raiz) |
| `icon-512.png` | 512×512 | Splash screen PWA |
| `site.webmanifest` | — | Manifesto PWA |
| `scripts/generate-icons.js` | — | Script de geração |

---

## HTMLs atualizados (17 arquivos)

Todos os arquivos `.html` do projeto foram atualizados com:

```html
<!-- Adicionado antes do <link rel="manifest"> -->
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png" />
<link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- Referência do manifest atualizada -->
<link rel="manifest" href="/site.webmanifest" />  <!-- era: /manifest.json -->
```

A tag `<link rel="apple-touch-icon" href="/icons/icon.svg" />` (incorreta — iOS não suporta SVG) foi removida de todos os HTMLs.

---

## Manifest criado — `site.webmanifest`

```json
{
  "name": "Sanca Burgers",
  "short_name": "Sanca Burgers",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#EA580C",
  "icons": [
    { "src": "/icons/icon.svg",   "sizes": "any",    "purpose": "any" },
    { "src": "/icon-192.png",     "sizes": "192x192", "purpose": "any" },
    { "src": "/icon-512.png",     "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

O `manifest.json` original foi mantido intacto.

---

## Robots — nenhuma alteração necessária

`robots.txt` tem `Allow: /` como regra padrão. Nenhum caminho de favicon ou manifest está bloqueado.

---

## Domínio definido no projeto

**`robots.txt`** referencia `https://sankaburgers.com.br/sitemap.xml` com um comentário `# TODO: Atualizar domínio real`. O domínio definitivo ainda não foi confirmado — `metadataBase` não se aplica a este projeto (é vanilla JS, não Next.js). As URLs dos ícones já usam caminhos relativos (`/favicon.ico`, `/icon-192.png`) e funcionarão com qualquer domínio.

---

## Como regenerar os ícones no futuro

```bash
node scripts/generate-icons.js
```

Para usar o logo PNG em alta resolução (`LOGO/logo 1.png`), altere `SOURCE` no script de `icons/icon-512.png` para `LOGO/logo 1.png`.

---

## Como testar em produção

```
https://sankaburgers.com.br/favicon.ico          → ICO multi-size (não 404)
https://sankaburgers.com.br/favicon-48x48.png    → PNG 48×48
https://sankaburgers.com.br/favicon-96x96.png    → PNG 96×96
https://sankaburgers.com.br/icon-192.png          → PNG 192×192
https://sankaburgers.com.br/icon-512.png          → PNG 512×512
https://sankaburgers.com.br/apple-touch-icon.png  → PNG 180×180
https://sankaburgers.com.br/site.webmanifest      → JSON válido
```

- Safari Mobile → Adicionar à tela inicial → deve exibir o "S" laranja
- Chrome DevTools → Application → Manifest → confirmar icons carregados
