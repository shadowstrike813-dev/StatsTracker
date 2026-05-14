const CACHE_NAME = 'health-tracker-v5';

const ASSETS = [
  './index.html',
  './home.html',
  './blood-pressure.html',
  './blood-pressure.js',
  './weight.html',
  './weight.js',
  './profile.html',
  './profile.js',
  './workout.html',
  './workout.js',
  './exercise.html',
  './exercise.js',
  './configure-exercises.html',
  './configure-exercises.js',
  './sleep.html',
  './sleep.js',
  './sessions.html',
  './sessions.js',
  './session-active.html',
  './session-active.js',
  './session-templates.html',
  './session-templates.js',
  './drag-touch.js',
  './nav.css',
  './nav.js',
  './style.css',
  './db.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Ignora extensii de browser
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  const pathname = url.pathname;
  const filename = pathname.split('/').pop() || 'index.html';

  e.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const exactMatch = await cache.match(e.request);
      if (exactMatch) return exactMatch;

      if (filename.endsWith('.html') || filename === '') {
        const htmlFile = filename || 'home.html';
        const cacheKey = new Request('./' + htmlFile);
        const htmlMatch = await cache.match(cacheKey);
        if (htmlMatch) return htmlMatch;
      }

      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const fallback = await cache.match('./home.html');
        if (fallback) return fallback;
      }
    })
  );
});