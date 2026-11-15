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
// Font stylesheet imported by src/index.css, saved at install so even the first visit works offline.
const fontCss = (await readFile('src/index.css', 'utf8')).match(/@import url\("(https:\/\/fonts\.googleapis\.com[^"]+)"\)/)?.[1] ?? null
const assets = files.map(file => './' + file.replaceAll('\\', '/').replace(/^dist\//, ''))
await writeFile('dist/sw.js', `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(assets)};
const FONT_CSS = ${JSON.stringify(fontCss)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(ASSETS);
    if (FONT_CSS) try {
      const res = await fetch(FONT_CSS);
      const css = await res.clone().text();
      await cache.put(FONT_CSS, res);
      const fonts = [...css.matchAll(/url\\((https:[^)]+)\\)/g)].map(m => m[1]);
      await Promise.all(fonts.map(u => cache.add(u).catch(() => {})));
    } catch {}
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('crew-visual-ui-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Inter comes from Google Fonts: keep a copy so the app looks the same offline.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok || res.type === 'opaque') cache.put(event.request, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
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
