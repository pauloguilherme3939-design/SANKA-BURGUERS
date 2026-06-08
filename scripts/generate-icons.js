/**
 * Gera todos os ícones/favicon para Sanca Burgers e atualiza os HTMLs.
 * Run: node scripts/generate-icons.js
 *
 * Fonte: icons/icon-512.png (ícone real da marca — fundo preto + "S" gradiente laranja)
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Ícones a gerar na raiz do projeto ────────────────────────
const SOURCE = path.join(ROOT, 'icons', 'icon-512.png');

const PNG_TASKS = [
  { size: 48,  file: 'favicon-48x48.png' },
  { size: 96,  file: 'favicon-96x96.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
];

function buildIco(pngBuffers, sizes) {
  const count   = pngBuffers.length;
  const dirSize = 6 + 16 * count;
  const offsets = [];
  let pos = dirSize;
  for (const buf of pngBuffers) { offsets.push(pos); pos += buf.length; }
  const ico = Buffer.alloc(pos);
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(count, 4);
  for (let i = 0; i < count; i++) {
    const b = 6 + i * 16, s = sizes[i];
    ico.writeUInt8(s >= 256 ? 0 : s, b);     ico.writeUInt8(s >= 256 ? 0 : s, b + 1);
    ico.writeUInt8(0, b + 2);                 ico.writeUInt8(0, b + 3);
    ico.writeUInt16LE(1, b + 4);              ico.writeUInt16LE(32, b + 6);
    ico.writeUInt32LE(pngBuffers[i].length, b + 8);
    ico.writeUInt32LE(offsets[i], b + 12);
  }
  for (let i = 0; i < count; i++) pngBuffers[i].copy(ico, offsets[i]);
  return ico;
}

// ── site.webmanifest ──────────────────────────────────────────
const MANIFEST = {
  name: 'Sanca Burgers',
  short_name: 'Sanca Burgers',
  description: 'Hambúrgueres artesanais em Rio Claro/SP. Blend exclusivo, moído no dia.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0A0A0A',
  theme_color: '#EA580C',
  orientation: 'portrait-primary',
  lang: 'pt-BR',
  categories: ['food'],
  icons: [
    { src: '/icons/icon.svg',        sizes: 'any',    type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon-192.png',          sizes: '192x192', type: 'image/png',    purpose: 'any' },
    { src: '/icon-512.png',          sizes: '512x512', type: 'image/png',    purpose: 'any maskable' },
  ],
};

// ── Tags a injetar em todos os HTMLs ─────────────────────────
const FAVICON_BLOCK = [
  '<link rel="icon" href="/favicon.ico" sizes="any" />',
  '<link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png" />',
  '<link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
].join('\n    ');

const HTML_FILES = [
  'index.html', 'cardapio.html', 'monte.html', 'clube.html', 'clube-sanka.html',
  'pedido.html', 'nossa-carne.html', 'oferta.html', 'privacidade.html',
  'termos-clube.html', 'admin-clube.html', 'admin-pedidos.html',
  'delivery-hamburgueria-rio-claro.html', 'hamburguer-grande-rio-claro.html',
  'hamburgueria-artesanal-rio-claro.html', 'lanche-prensado-rio-claro.html',
  'melhor-hamburgueria-rio-claro.html',
];

function patchHtml(content) {
  // 1 — Remove apple-touch-icon apontando para SVG (não funciona no iOS)
  content = content.replace(
    /<link\s+rel="apple-touch-icon"\s+href="\/icons\/icon\.svg"\s*\/>/g,
    '',
  );

  // 2 — Atualiza referência do manifest para site.webmanifest
  content = content.replace(
    /<link\s+rel="manifest"\s+href="\/manifest\.json"\s*\/>/g,
    '<link rel="manifest" href="/site.webmanifest" />',
  );

  // 3 — Injeta bloco de favicon antes do </head> se ainda não existir
  if (!content.includes('/favicon.ico')) {
    content = content.replace(
      /(<link\s+rel="manifest")/,
      `${FAVICON_BLOCK}\n    $1`,
    );
    // Se não encontrou manifest, injeta antes de </head>
    if (!content.includes('/favicon.ico')) {
      content = content.replace(
        /<\/head>/i,
        `    ${FAVICON_BLOCK}\n    <link rel="manifest" href="/site.webmanifest" />\n  </head>`,
      );
    }
  }

  return content;
}

async function main() {
  console.log('Gerando ícones para Sanca Burgers...\n');

  // ── PNGs ──────────────────────────────────────────────────
  for (const { size, file } of PNG_TASKS) {
    await sharp(SOURCE).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(ROOT, file));
    console.log(`  ✓ ${file} (${size}x${size})`);
  }

  // ── favicon.ico (16, 32, 48) ──────────────────────────────
  const icoSizes   = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) => sharp(SOURCE).resize(s, s).png().toBuffer()),
  );
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), buildIco(icoBuffers, icoSizes));
  console.log('  ✓ favicon.ico (16+32+48 multi-size)');

  // ── site.webmanifest ──────────────────────────────────────
  fs.writeFileSync(
    path.join(ROOT, 'site.webmanifest'),
    JSON.stringify(MANIFEST, null, 2) + '\n',
  );
  console.log('  ✓ site.webmanifest');

  // ── Patching HTML files ───────────────────────────────────
  console.log('\nAtualizando HTML files...');
  for (const file of HTML_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) { console.log(`  ⚠ SKIP ${file} (não encontrado)`); continue; }
    const original = fs.readFileSync(filePath, 'utf8');
    const patched  = patchHtml(original);
    if (patched !== original) {
      fs.writeFileSync(filePath, patched, 'utf8');
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  = ${file} (sem alteração)`);
    }
  }

  console.log('\nTudo pronto!');
}

main().catch((e) => { console.error(e); process.exit(1); });
