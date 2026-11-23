// Ultra school: работа без сети. Сначала сеть (чтобы ученики сразу получали обновления),
// если сети нет — последняя сохранённая копия.
// Саму страницу всегда перепроверяем на сервере (no-cache): иначе браузер до 10 минут держит старый index.html
// со ссылками на старые скрипты, и после выкладки получается смесь версий.
const CACHE = 'ultraschool-v3';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Видео не кэшируем: тяжёлое и приходит частями (Range)
  if (req.headers.has('range') || /\.mp4$/.test(new URL(req.url).pathname)) return;
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);
  e.respondWith(
    net.then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(req, c)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))
  );
});
