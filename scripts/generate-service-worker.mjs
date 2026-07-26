import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const hash = (content) => createHash('sha256').update(content).digest('hex');

export function fingerprintPrecache(entries) {
  const records = entries
    .filter(({ path }) => path !== '/sw.js')
    .map(({ path, content }) => `${path}:${hash(content)}`)
    .sort();
  return hash(records.join('\n')).slice(0, 12);
}

const walk = async (directory, prefix = '') => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(`${directory}/${entry.name}`, relative));
    else files.push(relative);
  }
  return files;
};

export async function generateServiceWorker(distDirectory = 'dist') {
  const files = (await walk(distDirectory)).filter((file) => file !== '/sw.js').sort();
  const entries = await Promise.all(files.map(async (path) => ({ path, content: await readFile(`${distDirectory}${path}`) })));
  const fingerprint = fingerprintPrecache(entries);
  const source = `const CACHE = 'engrave-${fingerprint}';
const CACHE_PREFIX = 'engrave-';
const META_CACHE = 'engrave-cache-metadata';
const META_KEY = '/__engrave_cache_generations__';
const PRECACHE = ${JSON.stringify(files)};
self.readGenerations = async () => {
  const metadata = await (await caches.open(META_CACHE)).match(META_KEY);
  if (!metadata) return { current: null, previous: null };
  try { return await metadata.json(); } catch { return { current: null, previous: null }; }
};
self.isGenerationCache = key => /^engrave-[a-f0-9]{12}$/.test(key);
self.findMigrationPrevious = async keys => {
  const candidates = keys.filter(key => self.isGenerationCache(key) && key !== CACHE);
  const dated = await Promise.all(candidates.map(async key => {
    const response = await (await caches.open(key)).match('/index.html');
    return { key, date: Date.parse(response?.headers.get('date') || '') || 0 };
  }));
  dated.sort((a, b) => b.date - a.date || b.key.localeCompare(a.key));
  return dated[0]?.key || null;
};
self.matchCurrentThenPrevious = async request => {
  const currentMatch = await (await caches.open(CACHE)).match(request);
  if (currentMatch) return currentMatch;
  const { previous } = await self.readGenerations();
  return previous ? (await caches.open(previous)).match(request) : undefined;
};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  const metadata = await self.readGenerations();
  const previous = metadata.current && metadata.current !== CACHE && keys.includes(metadata.current) ? metadata.current : await self.findMigrationPrevious(keys);
  await (await caches.open(META_CACHE)).put(META_KEY, new Response(JSON.stringify({ current: CACHE, previous })));
  const keep = new Set([CACHE, previous].filter(Boolean));
  await Promise.all(keys.filter(key => self.isGenerationCache(key) && !keep.has(key)).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put('/index.html',copy)); return response; }).catch(() => self.matchCurrentThenPrevious('/index.html')));
    return;
  }
  event.respondWith(self.matchCurrentThenPrevious(event.request).then(cached => cached || fetch(event.request)));
});
`;
  await writeFile(`${distDirectory}/sw.js`, source);
  return { fingerprint, files, source };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  await generateServiceWorker();
}
