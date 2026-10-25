/* ============================================================
   SERVICE WORKER — Anti Anxiety App
   Versi: v20
   ============================================================ */

const CACHE_VERSION = 'v20';
const CACHE_NAME = `anti-anxiety-${CACHE_VERSION}`;
const RUNTIME_CACHE = `anti-anxiety-runtime-${CACHE_VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './blog.html',
    './about.html',
    './partner.html',
    './contact.html',
    './privacy.html',
    './disclaimer.html',
    './terms.html',
    './manifest.json',
    './logoaa.png'
];

// CDN yang di-cache saat runtime (offline-friendly)
const CDN_HOSTS = [
    'cdn.tailwindcss.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// 1. Install — precache aset lokal
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                console.log('[SW] Gagal cache sebagian aset:', err);
            });
        })
    );
});

// 2. Activate — hapus cache versi lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[SW] Hapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch — strategi routing
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET
    if (request.method !== 'GET') return;

    // Skip scheme non-http
    if (!request.url.startsWith('http')) return;

    const url = new URL(request.url);

    // A) Navigasi HTML → network-first, fallback cache halaman → index
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                // Coba cache halaman yang diminta dulu
                const cachedPage = await caches.match(request);
                if (cachedPage) return cachedPage;
                // Fallback ke index.html
                const fallback = await caches.match('./index.html');
                if (fallback) return fallback;
                return new Response('Offline — halaman tidak tersedia', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            })
        );
        return;
    }

    // B) CDN eksternal → stale-while-revalidate (offline-friendly)
    if (CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                const fetchPromise = fetch(request)
                    .then((response) => {
                        if (response && (response.ok || response.type === 'opaque')) {
                            cache.put(request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // C) Same-origin asset → cache-first
    event.respondWith(
        caches.match(request).then((response) => {
            if (response) return response;
            return fetch(request).then((fresh) => {
                // Cache hanya same-origin response yang ok
                if (fresh && fresh.ok && url.origin === self.location.origin) {
                    const clone = fresh.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return fresh;
            }).catch(() => {
                return new Response('Aset tidak ditemukan', { status: 404 });
            });
        })
    );
});

// 4. GET_VERSION handler
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({
            type: 'VERSION_INFO',
            version: CACHE_VERSION
        });
    }
});

console.log('[SW] Loaded:', CACHE_VERSION);