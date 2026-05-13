const CACHE_NAME = 'health-tracker-v2';

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

// Instalare — cache toate resursele imediat
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activare — sterge cache-uri vechi
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — strategie inteligenta
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const pathname = url.pathname;

  // Extrage numele fisierului fara parametri
  const filename = pathname.split('/').pop() || 'index.html';

  e.respondWith(
    caches.open(CACHE_NAME).then(async cache => {

      // 1. Incearca sa gaseasca in cache exact URL-ul
      const exactMatch = await cache.match(e.request);
      if (exactMatch) return exactMatch;

      // 2. Pentru fisiere HTML cu parametri (ex: exercise.html?id=xyz)
      //    cauta in cache doar fisierul fara parametri
      if (filename.endsWith('.html') || filename === '') {
        const htmlFile = filename || 'home.html';
        const cacheKey = new Request('./' + htmlFile);
        const htmlMatch = await cache.match(cacheKey);
        if (htmlMatch) return htmlMatch;
      }

      // 3. Incearca reteaua
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // 4. Offline si nu e in cache — fallback la home
        const fallback = await cache.match('./home.html');
        if (fallback) return fallback;
      }
    })
  );
});
