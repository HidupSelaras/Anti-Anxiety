const CACHE_NAME = 'anti-anxiety-v12';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ===== Handler: laporkan versi cache ke halaman (dipanggil dari index.html) =====
// index.html mengirim { type: 'GET_VERSION' } via MessageChannel,
// lalu kita balas { type: 'CACHE_VERSION', version: CACHE_NAME }.
// Ini memungkinkan Pengaturan menampilkan versi cache tanpa hardcode di index.html.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        var port = event.ports && event.ports[0];
        if (port) {
            port.postMessage({ type: 'CACHE_VERSION', version: CACHE_NAME });
        } else if (event.source && event.source.postMessage) {
            event.source.postMessage({ type: 'CACHE_VERSION', version: CACHE_NAME });
        }
    }
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (!url.protocol.startsWith('http')) return;

    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(req).then((res) => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                }
                return res;
            }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('manifest.json')) {
        event.respondWith(
            fetch(req).then((res) => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                }
                return res;
            }).catch(() => caches.match(req))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req).then((res) => {
                if (res.ok || res.type === 'opaque') {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                }
                return res;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});