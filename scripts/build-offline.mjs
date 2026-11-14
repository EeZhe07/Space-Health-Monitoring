import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collect(path) : [path]
  }))
  return groups.flat().filter(path => !path.endsWith('sw.js'))
}
const paths = await collect('dist')
const contents = await Promise.all(paths.map(path => readFile(path)))
const hash = createHash('sha256')
contents.forEach(content => hash.update(content))
const version = 'crew-health-' + hash.digest('hex').slice(0, 12)
const assets = paths.map(path => './' + path.replaceAll('\\', '/').replace(/^dist\//, ''))
await writeFile('dist/sw.js', `
const CACHE = ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('crew-health-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      try { return await fetch(event.request); }
      catch { return await cache.match(new URL('index.html', self.registration.scope).href) || Response.error(); }
    }
    // Only same-origin build assets are cached. Preview servers can add Vary:
    // Origin, while precache and module requests carry different Origin headers.
    return await cache.match(event.request, { ignoreVary: true }) || fetch(event.request);
  })());
});
`)
console.log('Offline cache prepared:', paths.length, 'assets')
