import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://digital-lesson-plan.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // Increased to 2 minutes for backups and AI generation
});

// ── Cache Configuration ───────────────────────────────────────────
const CACHE_DURATION = 60_000;   // 60s — fresh window
const STALE_DURATION = 300_000;  // 5min — stale-while-revalidate window

const memCache = new Map();      // in-memory (session lifetime)

// Persist cache across soft navigation via sessionStorage
function readCache(key) {
  const mem = memCache.get(key);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(`api_cache:${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memCache.set(key, parsed);
      return parsed;
    }
  } catch (_) {}
  return null;
}

function writeCache(key, data) {
  const entry = { data, timestamp: Date.now() };
  memCache.set(key, entry);
  try { sessionStorage.setItem(`api_cache:${key}`, JSON.stringify(entry)); } catch (_) {}
}

function isEntryFresh(entry) {
  return entry && (Date.now() - entry.timestamp) < CACHE_DURATION;
}

function isEntryStale(entry) {
  const age = Date.now() - entry.timestamp;
  return age >= CACHE_DURATION && age < STALE_DURATION;
}

export function invalidateCache(urlPattern) {
  // Invalidate specific URL or all if no pattern
  if (!urlPattern) {
    memCache.clear();
    try {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith('api_cache:'))
        .forEach(k => sessionStorage.removeItem(k));
    } catch (_) {}
    return;
  }
  for (const key of memCache.keys()) {
    if (key.includes(urlPattern)) {
      memCache.delete(key);
      try { sessionStorage.removeItem(`api_cache:${key}`); } catch (_) {}
    }
  }
}

// Background revalidation: returns stale data instantly, then refreshes silently
async function revalidate(url, config) {
  try {
    const fresh = await axios.get(API_BASE_URL + url, {
      ...config,
      headers: { ...config.headers },
    });
    writeCache(url, fresh.data);
    // Notify components via a custom event so they can re-render if they care
    window.dispatchEvent(new CustomEvent('api:revalidate', { detail: { url, data: fresh.data } }));
  } catch (_) {}
}

// ── Auth Token Interceptor ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (config.method === 'get' && !config.noCache) {
      const cacheKey = config.url + (config.params ? JSON.stringify(config.params) : '');
      const cached = readCache(cacheKey);

      if (cached && isEntryFresh(cached)) {
        // Return from cache instantly
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (cached)',
            headers: {},
            config,
            request: {},
          });
      } else if (cached && isEntryStale(cached)) {
        // Stale-while-revalidate: serve stale immediately, refresh in background
        config.adapter = () => {
          revalidate(config.url, config);
          return Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (stale)',
            headers: {},
            config,
            request: {},
          });
        };
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Cache Writer & Error Handler ─────────────────────────
api.interceptors.response.use(
  (response) => {
    const method = response.config.method;

    if (method !== 'get') {
      // Smartly invalidate related caches on mutations
      const url = response.config.url || '';
      // Extract base resource (e.g. '/classes/5/add-student' → 'classes')
      const resource = url.split('/')[1];
      if (resource) invalidateCache(resource);
      if (url.includes('/syllabuses/import')) {
        invalidateCache('units');
      }
    } else {
      const cacheKey = response.config.url +
        (response.config.params ? JSON.stringify(response.config.params) : '');
      if (!response.config.noCache) {
        writeCache(cacheKey, response.data);
      }
    }
    return response;
  },
  (error) => {
    if (error.config?.method !== 'get') {
      const url = error.config?.url || '';
      const resource = url.split('/')[1];
      if (resource) invalidateCache(resource);
      if (url.includes('/syllabuses/import')) {
        invalidateCache('units');
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
