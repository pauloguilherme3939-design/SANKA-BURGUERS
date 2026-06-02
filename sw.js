// sw.js — Service Worker Sanka Burgers
// Estratégia:
//   assets estáticos → stale-while-revalidate (serve cache imediato, revalida em fundo)
//   imagens /assets/* → cache-first (raramente mudam)
//   /api/* e POST → network-only (nunca cachear)

const CACHE_STATIC = 'sanka-static-v3';
const CACHE_IMAGES = 'sanka-images-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/cardapio.html',
  '/nossa-carne.html',
  '/monte.html',
  '/oferta.html',
  '/styles.css',
  '/manifest.json',
  '/analytics.js',
  '/dist/home.js',
  '/dist/cardapio.js',
  '/dist/nossa-carne.js',
  '/dist/monte.js',
  '/dist/oferta.js',
  '/dist/pedido.js',
  '/dist/admin.js',
  '/dist/admin-pedidos.js',
];

/* ── Install: pré-cache dos assets estáticos ───────────── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then((c) => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // não bloqueia se algum asset falhar
  );
});

/* ── Activate: remove caches antigos ──────────────────── */
self.addEventListener('activate', (e) => {
  const validCaches = [CACHE_STATIC, CACHE_IMAGES];
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ─────────────────────────────────────────────── */
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignorar: POST/PATCH, API routes, CDNs externos, chrome-extension
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (!url.origin.startsWith(self.location.origin)) return;

  // Imagens: cache-first (ficam em cache separado, expiram na próxima versão)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // Tudo mais: stale-while-revalidate
  e.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
});

/* ── Strategies ────────────────────────────────────────── */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  return cached || await networkPromise || offlineFallback(request);
}

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return offlineFallback(request);
  }
}

function offlineFallback(request) {
  const isPage = request.headers.get('accept')?.includes('text/html');
  if (isPage) {
    return new Response(
      '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sem conexão — Sanka Burgers</title></head><body style="font-family:sans-serif;background:#0F0D0B;color:#F8F4F0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="font-size:2rem;margin-bottom:1rem">Sem conexão</h1><p style="color:#9CA3AF">Verifique sua internet e tente novamente.</p></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('', { status: 503 });
}
