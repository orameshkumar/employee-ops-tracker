const CACHE = 'ops-tracker-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', e => {
  // Skip non-http(s) requests (chrome-extension, data:, etc.)
  if (!e.request.url.startsWith('http')) return
  // Network-first: fall back to cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
