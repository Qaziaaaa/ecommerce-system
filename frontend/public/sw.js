/**
 * Service Worker for NOVA E-Commerce
 * Caches static assets for fast repeat visits and offline support.
 * Requirements: 1.7, 5.5
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `nova-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `nova-images-${CACHE_VERSION}`;
const API_CACHE = `nova-api-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/hero.png',
];

// Cache strategies
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|ico)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const API_PATTERN = /\/api\/v1\//;

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Non-fatal: some assets may not exist yet
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
  // Activate immediately without waiting for old SW to be released
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== IMAGE_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (except images/CDN)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // API requests — network-first, short cache fallback
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(request, API_CACHE, 60)); // 60s TTL
    return;
  }

  // Images — cache-first with long TTL
  if (IMAGE_EXTENSIONS.test(url.pathname) || IMAGE_EXTENSIONS.test(url.href)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // JS/CSS/fonts — cache-first (versioned by Vite hash)
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigation — network-first, fall back to cached index.html for SPA
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }
});

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * Cache-first: serve from cache, fetch and update cache on miss.
 * Best for versioned static assets and images.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Network-first: try network, fall back to cache.
 * Best for API responses where freshness matters.
 */
async function networkFirst(request, cacheName, maxAgeSeconds = 300) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      // Check if cached response is still fresh enough
      const cachedDate = cached.headers.get('sw-cached-at');
      if (cachedDate) {
        const age = (Date.now() - parseInt(cachedDate, 10)) / 1000;
        if (age < maxAgeSeconds) return cached;
      } else {
        return cached; // Return without age check if no timestamp
      }
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Navigation handler: network-first for HTML, fall back to /index.html for SPA routing.
 */
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match('/index.html') || await cache.match('/');
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
