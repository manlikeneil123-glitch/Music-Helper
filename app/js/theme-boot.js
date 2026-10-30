// Runs in <head> before anything paints, so the page never flashes the wrong theme.
// Settings (settings.js) writes these two keys; the theme also syncs with an account.
(function () {
  try {
    var d = document.documentElement;
    var t = localStorage.getItem('stave:theme') === 'day' ? 'day' : 'night';
    d.setAttribute('data-theme', t);
    if (localStorage.getItem('stave:still') === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches) d.classList.add('still');
    var bg = t === 'day' ? '#e9edf2' : '#0d1014';
    d.style.background = bg;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', bg);
  } catch (e) { /* storage blocked: Night, with motion */ }
})();
