/* Service Worker — Offline Support & Caching */

const CACHE_NAME = 'usman-dairy-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/admin.html',
  '/health.html',
  '/reports.html',
  '/style.css',
  '/api.js',
  '/home.js',
  '/admin.js',
  '/health.js',
  '/reports.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

// Install event — cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache.filter(url => !url.includes('http')))
          .catch(err => console.log('Cache add error:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event — serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first for API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if offline
          return caches.match(request)
            .then(cached => cached || new Response('Offline - no cached data', { status: 503 }));
        })
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200) return response;
              const cloned = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
              return response;
            });
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/index.html')
            .then(cached => cached || new Response('Offline', { status: 503 }));
        })
    );
  }
});

// Background sync for future API calls
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-api') {
    event.waitUntil(
      // Try to sync pending requests
      fetch('/api/cows')
        .then(() => console.log('Sync successful'))
        .catch(err => console.log('Sync failed:', err))
    );
  }
});

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
