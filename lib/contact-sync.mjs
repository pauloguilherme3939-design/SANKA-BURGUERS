// lib/contact-sync.mjs — WhatsApp e endereço numa fonte só (lib/brand.js)
// Roda no build: atualiza wa.me, "telephone", número exibido e o PostalAddress
// do JSON-LD nos HTMLs fixos. Falha se sobrar o número antigo.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'

const OLD_NUMBERS = ['5516993138450', '16993138450', '993138450', '99313-8450']

function brandField(src, key) {
  const m = src.match(new RegExp('^\\s*' + key + ':\\s*\'([^\']*)\'', 'm'))
  return m ? m[1] : ''
}

export function readContact(file = 'lib/brand.js') {
  const src = readFileSync(file, 'utf8')
  const whatsapp = brandField(src, 'whatsapp')
  if (!/^55\d{10,11}$/.test(whatsapp)) throw new Error('contact-sync: whatsapp inválido em lib/brand.js')
  return {
    whatsapp,
    display: whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3'),
    streetAddress: brandField(src, 'streetAddress'),
    zipCode: brandField(src, 'zipCode'),
    city: brandField(src, 'city'),
    state: brandField(src, 'state'),
  }
}

function htmlFiles() {
  return readdirSync('.').filter(f => f.endsWith('.html'))
    .concat(existsSync('admin') ? readdirSync('admin').filter(f => f.endsWith('.html')).map(f => 'admin/' + f) : [])
}

export function syncContact() {
  const c = readContact()
  let changed = 0
  for (const f of htmlFiles()) {
    const before = readFileSync(f, 'utf8')
    let s = before
      .replace(/wa\.me\/55\d{10,11}/g, 'wa.me/' + c.whatsapp)
      .replace(/("telephone":\s*")\+55\d{10,11}"/g, '$1+' + c.whatsapp + '"')
      .replace(/\(\d{2}\) 9?\d{4}-\d{4}/g, c.display)
    if (c.streetAddress) {
      s = s.replace(/"address":\s*\{\s*"@type":\s*"PostalAddress"[^}]*\}/g, m => {
        const ind = (m.match(/\n(\s*)"@type"/) || [, '    '])[1]
        const close = ind.slice(2)
        return '"address": {\n' +
          ind + '"@type": "PostalAddress",\n' +
          ind + '"streetAddress": "' + c.streetAddress + '",\n' +
          ind + '"addressLocality": "' + c.city + '",\n' +
          ind + '"addressRegion": "' + c.state + '",\n' +
          (c.zipCode ? ind + '"postalCode": "' + c.zipCode + '",\n' : '') +
          ind + '"addressCountry": "BR"\n' + close + '}'
      })
    }
    if (s !== before) { writeFileSync(f, s); changed++ }
  }
  const bad = htmlFiles().filter(f => OLD_NUMBERS.some(n => readFileSync(f, 'utf8').includes(n)))
  if (bad.length) throw new Error('contact-sync: número antigo sobrou em ' + bad.join(', '))
  console.log('  📞 WhatsApp: ' + c.display + ' · ' + changed + ' arquivo(s) atualizados')
  return changed
}
