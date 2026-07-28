const CACHE = 'hierro-v1';

// Archivos del shell de la app — se cachean al instalar
const SHELL = [
  '/',
  '/index.html'
];

// Al instalar: cachear el shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Al activar: limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: estrategia mixta
// - HTML del shell → Cache First (offline funciona)
// - Imágenes/GIFs de GitHub → Network First con fallback a caché
// - Todo lo demás → Network First
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Shell (mismo origen)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // GitHub raw (imágenes y GIFs del dataset)
  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          // Cachear solo imágenes y GIFs (no el JSON completo — muy pesado)
          if (res.ok && (url.pathname.includes('/images/') || url.pathname.includes('/videos/'))) {
            cache.put(e.request, res.clone());
          }
          return res;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Resto: network only
  e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
});
