import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const walk = async (directory, prefix = '') => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(`${directory}/${entry.name}`, relative));
    else files.push(relative);
  }
  return files;
};

const files = (await walk('dist')).filter((file) => file !== '/sw.js');
const fingerprint = createHash('sha256').update(await readFile('dist/index.html')).digest('hex').slice(0, 12);
const source = `const CACHE = 'engrave-${fingerprint}';
const PRECACHE = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => {
  const generations = keys.filter(key => key.startsWith('engrave-'));
  const keep = new Set([CACHE, ...generations.filter(key => key !== CACHE).slice(-1)]);
  return Promise.all(generations.filter(key => !keep.has(key)).map(key => caches.delete(key)));
}).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put('/index.html',copy)); return response; }).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
`;
await writeFile('dist/sw.js', source);
