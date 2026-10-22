// lib/print-gen.mjs — Material impresso gerado no build
// - bilhete.html: QR (siteUrl + ?utm_source=sacola), domínio por extenso e a
//   linha do cupom — que só aparece se o cupom EXISTIR nas regras do pedido
//   (lib/order-rules.json) e isLaunchCouponActive estiver ligado em brand.js.
// - print/qr-panfleto.png: QR em alta resolução (siteUrl + ?utm_source=panfleto)
// Todo QR é decodificado de volta (lib/qr-gen.mjs) e o build falha se não ler.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { qrSvg, qrPng, qrUrl } from './qr-gen.mjs'
import { readSiteUrl } from './site-domain.mjs'

function brandFlag(src, name) {
  const m = src.match(new RegExp(`^\\s*${name}:\\s*(true|false)\\b`, 'm'))
  return m ? m[1] === 'true' : false
}
function brandString(src, name) {
  const m = src.match(new RegExp(`^\\s*${name}:\\s*'([^']*)'`, 'm'))
  return m ? m[1] : ''
}

// Texto do cupom de 1º pedido, ou '' se não houver cupom válido de verdade
function couponLine() {
  const brand = readFileSync('lib/brand.js', 'utf8')
  const code  = brandString(brand, 'launchCoupon').toUpperCase()
  if (!code || !brandFlag(brand, 'isLaunchCouponActive')) return ''
  const rules  = JSON.parse(readFileSync('lib/order-rules.json', 'utf8'))
  const coupon = (rules.coupons || {})[code]
  if (!coupon) return ''
  const off = coupon.type === 'percent' ? `${coupon.value}% OFF`
    : coupon.type === 'fixed' ? `R$ ${Number(coupon.value).toFixed(2).replace('.', ',')} OFF`
    : coupon.label
  if (!off) return ''
  return `<p class="b-cupom">1º pedido pelo site: <strong>${off}</strong> com o cupom <strong class="b-code">${code}</strong></p>`
}

export async function generatePrint() {
  if (!existsSync('bilhete.html')) return
  const siteUrl = readSiteUrl()
  const blocks = {
    'qr-sacola': await qrSvg(qrUrl(siteUrl, 'sacola')),
    dominio: new URL(siteUrl).host,
    cupom: couponLine(),
  }
  const before = readFileSync('bilhete.html', 'utf8')
  const after = before.replace(/<!-- GERADO:([a-z-]+) -->[\s\S]*?<!-- \/GERADO:\1 -->/g, (m, name) => {
    if (!(name in blocks)) throw new Error(`print-gen: bloco desconhecido ${name}`)
    return `<!-- GERADO:${name} -->${blocks[name]}<!-- /GERADO:${name} -->`
  })
  if (after !== before) writeFileSync('bilhete.html', after)

  const bytes = await qrPng(qrUrl(siteUrl, 'panfleto'), 'print/qr-panfleto.png')
  console.log(`  🔳 QR: bilhete (sacola) e print/qr-panfleto.png (${Math.round(bytes / 1024)} KB) — leitura conferida · cupom no bilhete: ${blocks.cupom ? 'sim' : 'não (sem cupom ativo)'}`)
}
