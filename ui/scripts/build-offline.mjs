import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? collect(join(dir, entry.name)) : [join(dir, entry.name)]))).flat()
}
const files = (await collect('dist')).filter(file => !file.endsWith('sw.js'))
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(file))
const cache = 'crew-visual-ui-' + hash.digest('hex').slice(0, 12)
const assets = files.map(file => './' + file.replaceAll('\\', '/').replace(/^dist\//, ''))
await writeFile('dist/sw.js', `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('crew-visual-ui-') && key !== CACHE).map(key => caches.delete(key))
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
    return await cache.match(event.request, { ignoreVary: true }) || fetch(event.request);
  })());
});
`)
console.log('Visual UI offline cache prepared:', files.length, 'assets')
