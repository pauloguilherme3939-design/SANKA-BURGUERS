# AUDITORIA.md — Sanka Burguers
_Gerado em 2026-05-20 · Estado do projeto antes de qualquer alteração_

---

## Estado Atual

O projeto é um protótipo funcional de landing page única (SPA) construído com **React 18 via CDN + Babel standalone no browser** — sem build step, sem package manager, sem Node.js. Visualmente está bem resolvido: dark theme amber/orange, tipografia Anton + Space Grotesk, seções completas (Hero, Combos, Cardápio com filtros, Porções, Extras, Bebidas, Sobremesas, Diferenciais, Showcase, Depoimentos, CEP Checker, Final CTA, Footer). O conteúdo do cardápio está bem escrito (17 lanches, 4 combos, 6 porções, 21 adicionais, 15 bebidas, 3 sobremesas). No entanto, **nenhum CTA funciona**, todas as imagens são placeholders aleatórios de um CDN externo, os dados de contato são fictícios (endereço em SP, não Rio Claro), e o projeto contém código de prototipagem (TweaksPanel) que jamais deveria ir a produção. A stack é **incompatível** com o objetivo de migrar para Next.js + Tailwind + Framer Motion.

---

## Top 5 Problemas que Matam Conversão Hoje

### 1. Nenhum botão de pedir funciona
Todos os CTAs — "Pedir Agora", "Fazer Pedido", botões individuais de cada item — apontam para `#` ou disparam apenas um toast cosmético. O cliente que quer pedir literalmente não consegue. Perda de conversão: **100%**.

### 2. Imagens são todas aleatórias e inconsistentes
`FoodPlaceholder` carrega fotos via `https://loremflickr.com/640/512/{tags}` — imagens aleatórias do Flickr CC que mudam a cada reload e raramente mostram o que o texto descreve. O X Panceta aparece com foto de frango. O X Provolone ao Mel aparece com salsicha. Isso destrói a credibilidade e o apetite visual, que é o ativo mais importante de uma hamburgueria.

### 3. Dados de contato são completamente fictícios
- **Endereço:** "Rua das Brasas, 217, Vila Madalena, São Paulo" (a hamburgueria é em **Rio Claro/SP**)
- **Telefone:** (11) 9 8217-0044 (DDD de São Paulo)
- **CNPJ:** 00.000.000/0001-00
- **iFood/WhatsApp/Instagram:** todos apontam para `#`
- **Horário de funcionamento:** não confirmado
- Se um cliente do iFood tentar localizar a loja, vai achar o endereço errado.

### 4. Babel standalone no browser = performance ruim
O projeto transpila JSX em tempo de execução no browser usando `@babel/standalone` (~7MB). Isso adiciona ~500-800ms de parse antes do React inicializar, bloqueia a thread principal e resulta em FCP alto. Em mobile 3G, a página pode demorar 4-6s para mostrar qualquer conteúdo. Sem otimização de fonte (render-blocking), sem lazy loading real, sem compressão.

### 5. Sem SEO e sem link para delivery
Não há Open Graph tags, não há structured data (LocalBusiness JSON-LD), não há link verificado para iFood, Google Meu Negócio ou WhatsApp. Quando alguém pesquisar "Sanka Burguers Rio Claro" no Google, a landing não aparece com rich snippet. E mesmo chegando na página, não há caminho para pedir — o iFood é a principal fonte de pedidos mas está desconectado.

---

## Plano das Próximas 7 Etapas

```
Etapa 1 — Conteúdo real (BLOQUEANTE)
  Coletar: endereço real, horários, telefone, CNPJ, link iFood,
  número WhatsApp, @ Instagram, avaliação iFood real, fotos reais
  dos lanches (pelo menos Hero + 4-6 produtos destaque).
  → Sem isso, nenhuma etapa subsequente vale.

Etapa 2 — Setup Next.js + Tailwind + Framer Motion
  Inicializar projeto: npx create-next-app@latest sanka-web
  Instalar: tailwindcss, framer-motion, lucide-react, next-intl (opcional)
  Configurar: dark mode, paleta amber/orange como tokens CSS no tailwind.config
  Migrar data.jsx para src/lib/data.ts (tipado)

Etapa 3 — Componentes base + design system
  Migrar styles.css para Tailwind classes + CSS vars
  Criar: Button, Badge, Card, SectionHead, PriceTag
  Fonte: Anton + Space Grotesk via next/font (sem render-blocking)
  Remover TweaksPanel completamente

Etapa 4 — Seções Hero + Cardápio (core de conversão)
  Hero com imagem real (next/image, priority), badges animados (Framer Motion)
  Cardápio com filtros por categoria, imagens reais dos produtos
  CTA principal: botão WhatsApp com wa.me/link direto ou link iFood real

Etapa 5 — Seções complementares
  Combos, Porções, Bebidas, Sobremesas (reusar estrutura de dados)
  Showcase com fotos reais (grid masonry ou strip animado)
  Extras (manter grid interativo, sem carrinho real por ora)
  CEP Checker: integrar ViaCEP para validar o CEP + mostrar distância real

Etapa 6 — SEO + Conversão + Performance
  Metadata completo (OG, Twitter Cards)
  LocalBusiness JSON-LD (endereço, telefone, horário, avaliação)
  Sitemap.xml + robots.txt
  next/image em todos os produtos
  Web Vitals: LCP < 2.5s, CLS = 0

Etapa 7 — Deploy + Analytics
  Deploy Vercel (ou Netlify)
  Google Analytics 4 + heatmap (Hotjar free)
  Google Meu Negócio: atualizar link do site
  iFood: atualizar link no perfil da loja
```

---

## Riscos Técnicos / Decisões Antes de Começar

### DECISÃO CRÍTICA 1 — Fotos dos produtos
**O projeto depende completamente de fotos reais para funcionar.**
Opções:
- **A (recomendado):** Fazer um ensaio fotográfico antes de migrar. Pelo menos: 1 foto hero de destaque + 6-8 lanches populares.
- **B (provisório):** Usar as fotos do iFood da loja como placeholder temporário, migrar código já, atualizar fotos depois.
- **C (não recomendado):** Contratar banco de imagens genéricas de hambúrguer — não diferencia, prejudica autenticidade.

### DECISÃO CRÍTICA 2 — Integração de pedidos
Como o cliente vai pedir?
- **WhatsApp direto** (`wa.me/55119...?text=Olá, quero pedir...`) — simples, zero infraestrutura
- **Link iFood** — o mais provável no Brasil, zero manutenção
- **Sistema próprio** — complexo, desnecessário agora

**Recomendação:** WhatsApp como CTA principal + botão iFood no header. Carrinho próprio só em versão futura.

### DECISÃO CRÍTICA 3 — Domínio e hospedagem
O projeto não tem domínio configurado. Antes do deploy:
- Registrar `sankaburguers.com.br` (ou variação) no Registro.br
- Vercel Free tier é suficiente para landing page estática
- Configurar DNS apontando para Vercel

### RISCO TÉCNICO — Migração de stack (não é só "adaptar")
O projeto atual não tem package.json — é um protótipo HTML puro.
A migração para Next.js **não é uma conversão**, é uma **reescrita** dos componentes.
A boa notícia: a estrutura lógica (seções, dados, CSS) está bem definida e pode ser portada rapidamente. Estimativa: 2-3 dias de desenvolvimento concentrado se as fotos e dados reais estiverem disponíveis.

### RISCO TÉCNICO — TweaksPanel
O `tweaks-panel.jsx` é uma ferramenta de prototipagem (estilo Framer/FleetView) que não deve ir a produção. Remover completamente ao migrar — não adaptar.

### DADO INCONSISTENTE — Endereço e região
O footer diz "Vila Madalena, São Paulo" mas a hamburgueria é em **Rio Claro/SP**. Isso precisa ser corrigido antes de qualquer deploy. Um link do Google Maps incorreto pode destruir a reputação no delivery.

---

## Resumo de Arquivos Existentes

| Arquivo | Função | Status |
|---|---|---|
| `index.html` | Entry point, carrega React/Babel via CDN | Funcional mas não escalável |
| `app.jsx` | Root App, sistema de paletas, toast, TweaksPanel | Funcional, tem código de dev |
| `data.jsx` | Todos os dados do cardápio | Conteúdo bem escrito, dados fictícios |
| `sections.jsx` | Todos os componentes de seção | Funcional, CTAs apontam para `#` |
| `placeholders.jsx` | Imagens placeholder + ícones SVG | Placeholder, precisa de fotos reais |
| `styles.css` | ~1100 linhas de CSS manual | Bem escrito, responsivo, dark theme |
| `tweaks-panel.jsx` | Ferramenta de prototipagem | Remover ao migrar |
| `screenshots/` | 7 screenshots de versões anteriores | Referência visual apenas |
