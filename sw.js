// sw.js — Service Worker Sanka Burgers
// Estratégia: stale-while-revalidate para assets estáticos.
// API e requisições não-GET passam direto (sem cache).

const CACHE  = 'sanka-v1';
const STATIC = [
  '/',
  '/cardapio.html',
  '/nossa-carne.html',
  '/styles.css',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  if (e.request.url.includes('unpkg.com')) return; // CDN scripts: não cachear

  e.respondWith(
    caches.match(e.request).then((cached) => {
      // Atualiza o cache em background independentemente
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => {
          // Rede falhou — retorna cache se existir, senão resposta offline
          return cached || new Response(
            '<h1>Sem conexão</h1><p>Verifique sua internet.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });

      // Serve o cache imediatamente se disponível (stale-while-revalidate)
      return cached || networkFetch;
    })
  );
});
