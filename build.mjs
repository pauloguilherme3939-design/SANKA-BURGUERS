import * as esbuild from 'esbuild'

const isProd  = process.argv.includes('--prod')
const isWatch = process.argv.includes('--watch')

const shared = {
  bundle:    true,
  format:    'iife',
  minify:    isProd,
  sourcemap: !isProd,
  logLevel:  'info',
}

const pages = [
  { entryPoints: ['src/home.jsx'],        outfile: 'dist/home.js'        },
  { entryPoints: ['src/cardapio.jsx'],    outfile: 'dist/cardapio.js'    },
  { entryPoints: ['src/nossa-carne.jsx'], outfile: 'dist/nossa-carne.js' },
  { entryPoints: ['src/admin.jsx'],       outfile: 'dist/admin.js'       },
  { entryPoints: ['src/monte.jsx'],          outfile: 'dist/monte.js'          },
  { entryPoints: ['src/oferta.jsx'],         outfile: 'dist/oferta.js'         },
  { entryPoints: ['src/pedido.jsx'],         outfile: 'dist/pedido.js'         },
  { entryPoints: ['src/admin-pedidos.jsx'],  outfile: 'dist/admin-pedidos.js'  },
]

if (isWatch) {
  const ctxs = await Promise.all(pages.map(p => esbuild.context({ ...shared, ...p })))
  await Promise.all(ctxs.map(ctx => ctx.watch()))
  console.log('Watching for changes... (Ctrl+C to stop)')
} else {
  await Promise.all(pages.map(p => esbuild.build({ ...shared, ...p })))
  console.log('\nBuild completo! Arquivos em /dist')
}
