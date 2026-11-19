const prefix = 'worth-my-time-'
const cacheName = `${prefix}__CACHE_VERSION__`
const assets = new Set(__PRECACHE_FILES__)

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' }))),
  ).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const isAppNavigation = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')
  if (!isAppNavigation && (!assets.has(url.pathname) || url.search)) return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    // These are fixed, same-origin build files. A host may add Vary: Origin
    // to the module response even though it serves identical bytes.
    return await cache.match(isAppNavigation ? '/index.html' : request, { ignoreVary: true }) ?? fetch(request)
  })())
})
