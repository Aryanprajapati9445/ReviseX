/**
 * Lightweight in-memory API cache with TTL and in-flight deduplication.
 * Prevents hammering the backend with duplicate simultaneous requests.
 */

const cache = new Map(); // key → { data, ts } | { promise, ts }

/**
 * Fetch with caching. If the same key is already in-flight, shares the promise.
 * @param {string} key        Cache key (e.g. "notes-all")
 * @param {Function} fetchFn  Async function that returns the data
 * @param {number} ttlMs      Cache TTL in milliseconds (default 60s)
 */
export function cachedFetch(key, fetchFn, ttlMs = 60_000) {
  const hit = cache.get(key);

  // Valid cache hit
  if (hit && hit.data !== undefined && Date.now() - hit.ts < ttlMs) {
    return Promise.resolve(hit.data);
  }

  // Already in-flight: share the same promise (deduplication)
  if (hit && hit.promise) return hit.promise;

  // Start a new fetch
  const promise = fetchFn().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  }).catch(err => {
    cache.delete(key); // don't cache errors
    throw err;
  });

  cache.set(key, { promise, ts: Date.now() });
  return promise;
}

/** Manually invalidate a cache key (e.g. after admin creates/deletes). */
export function invalidateCache(key) {
  cache.delete(key);
}

/** Invalidate all cache entries whose key starts with a given prefix. */
export function invalidateCachePrefix(prefix) {
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

// Presigned URL cache (13 min TTL — URLs are valid for 15 min)
const urlCache = new Map(); // noteId → { url, fileName, mimeType, expiresAt }

export function getCachedUrl(noteId) {
  const entry = urlCache.get(noteId);
  if (entry && entry.expiresAt > Date.now()) return entry;
  return null;
}

export function setCachedUrl(noteId, data) {
  urlCache.set(noteId, { ...data, expiresAt: Date.now() + 13 * 60 * 1000 });
}
