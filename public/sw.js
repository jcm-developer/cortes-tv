/**
 * Service worker: lets the installed app open offline and keeps posters cached.
 *
 * - Pages: network first, falling back to the cached shell, so a deploy shows on the next open.
 * - Built assets (`/assets/`, hashed names): cache first, they never change.
 * - Other same-origin files: stale while revalidate.
 * - TMDB images: cache first, capped at MAX_IMAGES entries.
 * - TMDB API: network first, falling back to the last answer, so Home rows show offline.
 * - Everything else (Supabase) goes straight to the network.
 *
 * Bump VERSION to drop every cache on the next activation. See `docs/domains/ui.md`.
 */
const VERSION = 'v2';
const SHELL = `cortes-tv-shell-${VERSION}`;
const IMAGES = `cortes-tv-images-${VERSION}`;
const API = `cortes-tv-api-${VERSION}`;
const MAX_IMAGES = 400;
const MAX_API = 80;

const scope = new URL(self.registration.scope);
const SHELL_URLS = ['./', 'manifest.webmanifest', 'logo.png'].map((p) => new URL(p, scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('cortes-tv-') && ![SHELL, IMAGES, API].includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Deletes the oldest entries of a cache beyond a limit.
 *
 * @param {string} name - The cache name.
 * @param {number} max - The entries to keep.
 */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

/**
 * Answers from the network and stores a copy; falls back to the cache when offline.
 *
 * @param {Request} request - The request.
 * @param {string} name - The cache name.
 * @param {?string} [fallback] - A cached URL to answer with when nothing else matches.
 * @param {number} [max] - Entries to keep in the cache.
 * @return {Promise<Response>} The response.
 */
async function networkFirst(request, name, fallback = null, max = 0) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(request);
    if (res.ok) {
      await cache.put(request, res.clone());
      if (max) void trim(name, max);
    }
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) ?? (fallback && (await cache.match(fallback)));
    if (hit) return hit;
    throw err;
  }
}

/**
 * Answers from the cache, fetching and storing on a miss.
 *
 * @param {Request} request - The request.
 * @param {string} name - The cache name.
 * @param {number} [max] - Entries to keep in the cache.
 * @return {Promise<Response>} The response.
 */
async function cacheFirst(request, name, max = 0) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Opaque cross-origin images report status 0 but are still usable.
  if (res.ok || res.type === 'opaque') {
    await cache.put(request, res.clone());
    if (max) void trim(name, max);
  }
  return res;
}

/**
 * Answers from the cache at once and refreshes it in the background.
 *
 * @param {Request} request - The request.
 * @return {Promise<Response>} The response.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request);
  const update = fetch(request)
    .then((res) => {
      if (res.ok) void cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit ?? update;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, SHELL_URLS[0]));
  } else if (url.origin === scope.origin) {
    if (!url.href.startsWith(scope.href)) return;
    event.respondWith(
      url.pathname.includes('/assets/') ? cacheFirst(request, SHELL) : staleWhileRevalidate(request),
    );
  } else if (url.hostname === 'image.tmdb.org') {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
  } else if (url.hostname === 'api.themoviedb.org') {
    event.respondWith(networkFirst(request, API, null, MAX_API));
  }
});
