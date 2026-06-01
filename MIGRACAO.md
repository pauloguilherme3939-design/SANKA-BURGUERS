# Plano de Migração — Babel → esbuild + Tailwind Play CDN

## Contexto
O projeto hoje carrega Babel Standalone (~1 MB) no browser e transpila JSX em tempo real.
Isso torna o primeiro carregamento ~2-4× mais lento e prejudica SEO (conteúdo renderizado
depois que o Babel termina de compilar).

A migração substitui esse processo por um **build offline com esbuild** (< 100ms de build)
e mantém toda lógica existente intacta.

---

## Decisão de arquitetura: 4 bundles por página

O projeto tem 4 páginas com apps React independentes, cada uma com seu próprio
`ReactDOM.createRoot().render()`. Concentrar tudo num único `bundle.js` exigiria
um dispatcher com `data-page` nos `<body>` e guards em cada app — mais complexidade
sem ganho real para 4 páginas estáticas.

**Recomendação: 4 bundles separados:**

| Arquivo HTML       | Bundle gerado        |
|--------------------|----------------------|
| `index.html`       | `dist/home.js`       |
| `cardapio.html`    | `dist/cardapio.js`   |
| `nossa-carne.html` | `dist/nossa-carne.js`|
| `admin-clube.html` | `dist/admin.js`      |

> Se você preferir mesmo assim um único `bundle.js`, eu implemento o dispatcher
> (requer adicionar `data-page` no `<body>` de cada HTML + guards nos 4 app files).

---

## O que muda em cada arquivo

### package.json
```json
"devDependencies": {
  "esbuild": "^0.25.0",
  "concurrently": "^9.0.0"
},
"scripts": {
  "build": "node build.mjs",
  "dev": "concurrently \"node build.mjs --watch\" \"node server.js\""
}
```

### build.mjs (novo arquivo)
```js
import { build } from 'esbuild'

const shared = {
  bundle: true,
  format: 'iife',
  // React/ReactDOM/Framer Motion ficam no CDN — não entram no bundle
  external: [],
  // Como o código usa `React` como global do CDN, precisamos de um shim
  inject: ['./src/react-shim.js'],
  minify: process.argv.includes('--prod'),
  sourcemap: !process.argv.includes('--prod'),
}

const pages = [
  { entryPoints: ['src/home.jsx'],       outfile: 'dist/home.js' },
  { entryPoints: ['src/cardapio.jsx'],   outfile: 'dist/cardapio.js' },
  { entryPoints: ['src/nossa-carne.jsx'],outfile: 'dist/nossa-carne.js' },
  { entryPoints: ['src/admin.jsx'],      outfile: 'dist/admin.js' },
]

// watch mode para dev
const watch = process.argv.includes('--watch')
await Promise.all(pages.map(p => build({ ...shared, ...p, watch })))
```

### src/react-shim.js (novo — shim global→module)
```js
// Expõe o React global do CDN como módulo para o esbuild
export const React = window.React
export const ReactDOM = window.ReactDOM
// Exporta hooks individualmente para imports de desestruturação
export const { useState, useEffect, useMemo, useRef, createContext, useContext } = window.React
```

### src/home.jsx (novo entry point)
```jsx
import './react-shim.js'
import '../data.jsx'
import '../placeholders.jsx'
import '../lib/config.js'
import '../sections.jsx'
import '../app.jsx'
import '../clube-modal.jsx'
```

> Cada arquivo JSX existente precisará trocar `const { useState } = React` por
> `import { useState } from '../src/react-shim.js'` — mudança mecânica, sem lógica.

### Mudanças nos arquivos JSX existentes
Cada arquivo atualmente exporta via `Object.assign(window, {...})`. Com esbuild em
modo bundle, as exportações entre arquivos precisam ser ES module:

**Exemplo — placeholders.jsx:**
```js
// ANTES
Object.assign(window, { FoodPlaceholder, FeatureIcon })

// DEPOIS
export { FoodPlaceholder, FeatureIcon }
```

**E o arquivo que importa:**
```js
// sections.jsx — linha de topo
import { FoodPlaceholder } from './placeholders.jsx'
```

Essa é a única mudança estrutural. **Toda a lógica de componentes, dados e UI
permanece exatamente igual.**

### Tailwind Play CDN (nos 4 HTMLs)
```html
<!-- No <head> de cada HTML, antes do styles.css -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        fire:   { DEFAULT: '#C2410C', light: '#EA580C', dark: '#9A3412' },
        amber:  { DEFAULT: '#D97706', light: '#F59E0B' },
        ink:    { DEFAULT: '#F8F4F0', mute: '#9CA3AF', dim: '#6B7280' },
        carbon: { DEFAULT: '#0F0D0B', mid: '#1A1714', surface: '#242019' },
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        black:   ['Archivo Black', 'sans-serif'],
        body:    ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
</script>
```

`styles.css` continua carregado normalmente — Tailwind complementa, não substitui.

### .gitignore
```
dist/          # gerado pelo build — não commitado
```

### .vercelignore
```
# /dist NÃO entra aqui — precisa ser deployado
node_modules/
CARDAPIO SANKA BURGUERS/
screenshots/
```

### vercel.json
```json
{
  "buildCommand": "npm run build -- --prod",
  "installCommand": "npm install",
  ...
}
```

---

## Ordem de execução (após aprovação)

1. `npm install --save-dev esbuild concurrently` 
2. Criar `src/react-shim.js`
3. Criar `src/home.jsx`, `src/cardapio.jsx`, `src/nossa-carne.jsx`, `src/admin.jsx`
4. Converter cada `.jsx` existente: remover `Object.assign(window, {...})` → `export {}` + adicionar imports
5. Criar `build.mjs`
6. Atualizar `package.json` scripts
7. Atualizar os 4 HTMLs (remover Babel CDN + `type="text/babel"`, adicionar Tailwind config + `<script src="/dist/xxx.js" defer>`)
8. Atualizar `.gitignore` e `vercel.json`
9. Rodar `npm run build` e verificar
10. Teste visual nas 4 páginas localmente

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Framer Motion — `const { motion } = Motion` usa global `Motion` | Adicionar `Motion` ao react-shim ou manter como CDN global |
| `analytics.js` é script puro (sem JSX) — continua como `<script src>` normal | Manter tag `<script src="analytics.js">` nos HTMLs |
| Ordem de carregamento dos scripts | Entry points garantem a ordem correta no bundle |
| `nossa-carne-app.jsx` depende de Framer Motion CDN | Manter `<script src="framer-motion.umd.js">` só nessa página |

---

## Checklist final (para validação após execução)

- [ ] Build passa sem erro (`npm run build`)
- [ ] `index.html` carrega `dist/home.js` e renderiza a home completa
- [ ] `cardapio.html` carrega `dist/cardapio.js`, filtros e carrinho funcionam
- [ ] `nossa-carne.html` carrega `dist/nossa-carne.js`, animações Framer Motion funcionam
- [ ] `admin-clube.html` carrega `dist/admin.js`, login e tabela funcionam
- [ ] Tailwind funcional (classe `bg-fire` aplica laranja)
- [ ] `styles.css` não quebrou nada visual
- [ ] `vercel.json` com `buildCommand` correto

---

**Aguardando sua aprovação. Responda "pode executar" para iniciar.**
