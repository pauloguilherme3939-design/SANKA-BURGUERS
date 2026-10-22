// lib/site-domain.mjs — Domínio do site numa fonte só (lib/brand.js → siteUrl)
// Roda no build.mjs (local e na Vercel). Troca o domínio antigo por siteUrl em
// todos os .html, sitemap.xml e robots.txt (canonical, og:url, og:image, JSON-LD)
// e falha o build se sobrar algum domínio antigo. Só reescreve arquivo que mudou.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'

// Domínios que já foram usados no projeto — trocados por siteUrl onde aparecerem
const KNOWN_ORIGINS = [
  'https://sankaburguers.vercel.app',
  'https://sankaburgers.com.br',
  'https://www.sankaburgers.com.br',
]

// Lido do texto do arquivo para não depender do tipo de módulo do Node
export function readSiteUrl(file = 'lib/brand.js') {
  const m = readFileSync(file, 'utf8').match(/^\s*siteUrl:\s*'([^']+)'/m)
  if (!m) throw new Error('lib/brand.js: siteUrl não encontrado')
  return new URL(m[1]).origin
}

export function syncSiteDomain() {
  const siteUrl = readSiteUrl()
  const files = readdirSync('.').filter(f => f.endsWith('.html'))
    .concat(existsSync('admin') ? readdirSync('admin').filter(f => f.endsWith('.html')).map(f => `admin/${f}`) : [])
    .concat(['sitemap.xml', 'robots.txt'].filter(f => existsSync(f)))

  const origins = new Set(KNOWN_ORIGINS)
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/rel="canonical" href="(https?:\/\/[^/"]+)/g)) origins.add(m[1])
  }
  origins.delete(siteUrl)

  let changed = 0
  for (const f of files) {
    const before = readFileSync(f, 'utf8')
    let t = before
    for (const o of origins) t = t.split(o).join(siteUrl)
    if (t !== before) { writeFileSync(f, t); changed++ }
  }

  const bad = []
  for (const f of files) {
    const t = readFileSync(f, 'utf8')
    for (const o of KNOWN_ORIGINS) if (o !== siteUrl && t.includes(o)) bad.push(`${f}: ${o}`)
  }
  if (bad.length) throw new Error('site-domain: domínio antigo sobrou em ' + bad.join(', '))

  console.log(`  🌐 Domínio: ${siteUrl} · ${changed} arquivo(s) atualizados`)
  return siteUrl
}
