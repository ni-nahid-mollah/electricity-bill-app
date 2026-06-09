// ===============================
// SERVICE WORKER - OFFLINE SUPPORT
// Electricity Bill App
// ===============================

const CACHE_NAME = "electricity-bill-v1";

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json"
];

// ===============================
// INSTALL EVENT
// ===============================
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ===============================
// ACTIVATE EVENT
// ===============================
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ===============================
// FETCH EVENT (OFFLINE SUPPORT)
// ===============================
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});