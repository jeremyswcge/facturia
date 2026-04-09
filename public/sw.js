// Facturia service worker — basic offline shell + runtime caching.
const VERSION = 'facturia-v1'
const OFFLINE_URL = '/offline'
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Never cache API/auth/server actions
  if (url.pathname.startsWith('/api/')) return

  // Navigation: network-first, fall back to offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone())
        return res
      }).catch(() => cached)
      return cached || network
    })
  )
})
