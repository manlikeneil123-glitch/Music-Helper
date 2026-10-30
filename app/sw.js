// Offline-first app shell. Bump VERSION when shipping changes.
const VERSION = 'mh-v10';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'fonts/noto-music.woff2',
  'fonts/geist.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'js/app.js',
  'js/background.js',
  'js/icons.js',
  'js/welcome.js',
  'js/store.js',
  'js/music.js',
  'js/audio.js',
  'js/input.js',
  'js/flashcards.js',
  'js/timer.js',
  'js/pieces.js',
  'js/analysis.js',
  'js/check.js',
  'js/score.js',
  'js/render.js',
  'js/musicxml.js',
  'scores/octave-study.musicxml',
  'js/mic.js',
  'js/micanalysis.js',
  'js/tuning.js', 'js/config.js', 'js/cloud.js', 'js/sync.js', 'js/account.js', 'js/quality.js', 'js/plan.js', 'js/exam.js', 'js/examview.js', 'privacy.html',
  'img/piano-room-1920.webp',
  'img/piano-room-900.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate: instant from cache, refreshed in the background.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
