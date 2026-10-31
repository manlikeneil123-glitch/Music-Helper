// Offline-first app shell. Bump VERSION when shipping changes.
const VERSION = 'stave-0.10.0';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'fonts/noto-music.woff2',
  'fonts/geist.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/maskable-512.png',
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
  'js/tuning.js', 'js/config.js', 'js/cloud.js', 'js/sync.js', 'js/account.js', 'js/quality.js', 'js/plan.js', 'js/exam.js', 'js/examview.js', 'js/teach.js', 'js/studio.js', 'js/reportcard.js', 'js/assignlink.js', 'js/qr.js', 'js/work.js', 'js/pgrade.js', 'js/kit.js', 'js/kiteval.js', 'js/parent.js', 'js/settings.js', 'js/haptics.js', 'js/theme-boot.js', 'js/version.js', 'js/changelog.js', 'js/whatsnew.js', 'js/pwa.js', 'js/micsetup.js', 'js/tour.js', 'js/getstarted.js', 'parent.html', 'privacy.html', 'terms.html', 'help.html', 'accessibility.html',
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
  const url = new URL(e.request.url);
  // Only the app itself is cached: never account data, even if the API shares the domain.
  if (e.request.method !== 'GET' || url.origin !== location.origin || /\/(rest|auth|storage)\/v1\//.test(url.pathname)) return;
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
