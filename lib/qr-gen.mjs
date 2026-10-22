// lib/qr-gen.mjs — QR codes gerados localmente no build (sem serviço externo)
// Cada QR é decodificado de volta (jsQR) e o build FALHA se não ler a URL certa.
//
// - SVG inline do bilhete da sacola (?utm_source=sacola) → bilhete.html
// - PNG em alta resolução do panfleto (?utm_source=panfleto) → print/qr-panfleto.png

import QRCode from 'qrcode'
import jsQR   from 'jsqr'
import sharp  from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'

// Lê um PNG/SVG com sharp e decodifica com jsQR — devolve o texto lido
async function decode(input) {
  const { data, info } = await sharp(input, { density: 300 })
    .flatten({ background: '#ffffff' })
    .resize(600, 600, { fit: 'contain', background: '#ffffff' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const res = jsQR(new Uint8ClampedArray(data), info.width, info.height)
  return res ? res.data : null
}

async function assertReads(input, expected, label) {
  const got = await decode(input)
  if (got !== expected) throw new Error(`QR ${label}: leitura falhou (esperado ${expected}, lido ${got})`)
}

export function qrUrl(siteUrl, source) {
  return `${new URL(siteUrl).origin}/?utm_source=${source}`
}

// SVG em preto chapado (tinta econômica), margem de 4 módulos (zona de silêncio)
export async function qrSvg(url) {
  const svg = await QRCode.toString(url, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 4,
    color: { dark: '#000000', light: '#ffffff' },
  })
  await assertReads(Buffer.from(svg), url, 'SVG')
  return svg.replace('<svg ', '<svg role="img" aria-label="QR code para ' + url + '" ')
}

// PNG grande para gráfica: 2400 px (~20 cm a 300 dpi)
export async function qrPng(url, file) {
  const png = await QRCode.toBuffer(url, {
    type: 'png', errorCorrectionLevel: 'M', margin: 4, width: 2400,
    color: { dark: '#000000', light: '#ffffff' },
  })
  await assertReads(png, url, 'PNG')
  mkdirSync('print', { recursive: true })
  writeFileSync(file, png)
  return png.length
}
