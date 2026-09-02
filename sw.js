// sw.js — Service Worker Sanka Burgers
// Estratégia:
//   HTML, CSS e JS → network-first (evita cardápio e preços antigos)
//   imagens /assets/* → cache-first (raramente mudam)
//   /api/* e POST → network-only (nunca cachear)

const CACHE_STATIC = 'sanka-static-v5-master-upgrade-20260825';
const CACHE_IMAGES = 'sanka-images-v5-master-upgrade-20260825';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/cardapio.html',
  '/styles.css',
  '/site.webmanifest',
  '/analytics.js',
  '/dist/home.js',
  '/dist/cardapio.js',
  '/dist/pedido.js',
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

  // Páginas e arquivos que mudam no lançamento: sempre tentar a rede primeiro.
  const isPage = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  const isMutableAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (isPage || isMutableAsset) {
    e.respondWith(networkFirst(request, CACHE_STATIC));
    return;
  }

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

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return await cache.match(request) || offlineFallback(request);
  }
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
