/* ============================================================
   SERVICE WORKER — Anti Anxiety App
   Versi: v16
   ============================================================ */

const CACHE_NAME = 'anti-anxiety-v16';
const ASSETS = [
    './',
    './index.html',
    './blog.html',
    './about.html',
    './contact.html',
    './privacy.html',
    './disclaimer.html',
    './terms.html',
    './manifest.json'
];

// 1. Install Service Worker & Simpan Aset ke Cache
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Paksa SW baru langsung aktif
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => console.log('Gagal cache aset:', err));
        })
    );
});

// 2. Aktivasi & Hapus Cache Lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Hapus cache v15
                    }
                })
            );
        }).then(() => self.clients.claim()) // Langsung ambil kendali halaman
    );
});

// 3. Strategi Fetch (Network First untuk HTML, Cache First untuk aset statis)
self.addEventListener('fetch', (event) => {
    // Jika request adalah navigasi halaman (HTML)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Jika offline, tampilkan index.html dari cache
                return caches.match('./index.html');
            })
        );
        return;
    }
    
    // Untuk aset statis lainnya
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// 4. FITUR GET_VERSION (Menjawab panggilan dari index.html)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({ 
            type: 'VERSION_INFO', 
            version: CACHE_NAME 
        });
    }
});