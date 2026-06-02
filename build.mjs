import * as esbuild from 'esbuild'
import sharp        from 'sharp'
import { readdir, mkdir } from 'fs/promises'
import { existsSync }    from 'fs'
import path              from 'path'

const isProd  = process.argv.includes('--prod')
const isWatch = process.argv.includes('--watch')

/* ── esbuild ─────────────────────────────────────────────── */
const shared = {
  bundle:    true,
  format:    'iife',
  minify:    isProd,
  sourcemap: !isProd,
  logLevel:  'info',
}

const pages = [
  { entryPoints: ['src/home.jsx'],           outfile: 'dist/home.js'           },
  { entryPoints: ['src/cardapio.jsx'],       outfile: 'dist/cardapio.js'       },
  { entryPoints: ['src/nossa-carne.jsx'],    outfile: 'dist/nossa-carne.js'    },
  { entryPoints: ['src/admin.jsx'],          outfile: 'dist/admin.js'          },
  { entryPoints: ['src/monte.jsx'],          outfile: 'dist/monte.js'          },
  { entryPoints: ['src/oferta.jsx'],         outfile: 'dist/oferta.js'         },
  { entryPoints: ['src/pedido.jsx'],         outfile: 'dist/pedido.js'         },
  { entryPoints: ['src/admin-pedidos.jsx'],  outfile: 'dist/admin-pedidos.js'  },
]

/* ── Geração de WebP das imagens de burger ───────────────── */
async function generateWebP() {
  const dirs = [
    { src: 'assets/burgers', out: 'assets/burgers' },
    { src: 'assets/drinks',  out: 'assets/drinks'  },
    { src: 'assets/sides',   out: 'assets/sides'   },
  ]

  let converted = 0
  let skipped   = 0

  for (const { src, out } of dirs) {
    if (!existsSync(src)) continue
    const files = await readdir(src).catch(() => [])

    for (const file of files) {
      if (!/\.(png|jpg|jpeg)$/i.test(file)) continue
      const base    = path.basename(file, path.extname(file))
      const outFile = path.join(out, `${base}.webp`)

      if (existsSync(outFile)) { skipped++; continue }

      await sharp(path.join(src, file))
        .webp({ quality: 82, effort: 4 })
        .toFile(outFile)
        .catch((e) => console.warn(`  ⚠️  WebP failed for ${file}: ${e.message}`))

      converted++
    }
  }

  if (converted > 0) console.log(`  📸 WebP: ${converted} geradas, ${skipped} já existiam`)
  else               console.log(`  📸 WebP: todas já existiam (${skipped} arquivos)`)
}

/* ── Geração de ícones PNG da PWA ────────────────────────── */
async function generatePwaIcons() {
  const iconSrc = 'icons/icon.svg'
  if (!existsSync(iconSrc)) {
    console.warn('  ⚠️  icons/icon.svg não encontrado — ícones PNG não gerados')
    return
  }

  await mkdir('icons', { recursive: true })

  const sizes = [
    { size: 192,  out: 'icons/icon-192.png',       maskable: false },
    { size: 384,  out: 'icons/icon-384.png',       maskable: false },
    { size: 512,  out: 'icons/icon-512.png',       maskable: false },
    { size: 512,  out: 'icons/icon-maskable.png',  maskable: true  },
  ]

  let done = 0
  for (const { size, out, maskable } of sizes) {
    if (existsSync(out) && !isProd) { done++; continue }

    const s = sharp(iconSrc, { density: 300 }).resize(size, size)

    if (maskable) {
      // maskable: padding de ~20% para garantir safe zone
      const padded = Math.round(size * 0.8)
      await s
        .resize(padded, padded)
        .extend({ top: Math.round(size * 0.1), bottom: Math.round(size * 0.1), left: Math.round(size * 0.1), right: Math.round(size * 0.1), background: { r: 234, g: 88, b: 12, alpha: 1 } })
        .png()
        .toFile(out)
        .catch((e) => console.warn(`  ⚠️  Icon ${out}: ${e.message}`))
    } else {
      await s.png().toFile(out)
        .catch((e) => console.warn(`  ⚠️  Icon ${out}: ${e.message}`))
    }
    done++
  }

  console.log(`  🎨 PWA icons: ${done} geradas`)
}

/* ── Runner ──────────────────────────────────────────────── */
if (isWatch) {
  // No modo watch, roda WebP/ícones uma vez e depois assiste os JS
  await generateWebP()
  await generatePwaIcons()
  const ctxs = await Promise.all(pages.map(p => esbuild.context({ ...shared, ...p })))
  await Promise.all(ctxs.map(ctx => ctx.watch()))
  console.log('\n👀 Watching JS changes... (Ctrl+C to stop)')
} else {
  await generateWebP()
  await generatePwaIcons()
  await Promise.all(pages.map(p => esbuild.build({ ...shared, ...p })))
  console.log('\n✅ Build completo! Arquivos em /dist')
}
