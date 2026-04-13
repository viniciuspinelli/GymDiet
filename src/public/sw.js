/**
 * Service Worker
 * Enables basic PWA capabilities
 */

const CACHE_NAME = 'gymdiet-v1';
const assets = [
    '/',
    '/css/style.css',
    '/js/utils.js',
    '/manifest.json',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(assets).catch(() => {
                // Don't fail if assets are not available
            });
        })
    );
    self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                // Return cached response or fetch from network
                return response || fetch(event.request).then((response) => {
                    // Cache successful responses
                    if (response.ok) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                });
            });
        })
    );
});

// Activate event - clean up old caches
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
        })
    );
});
