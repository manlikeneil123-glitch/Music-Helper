// Photo background after the "Glassy Dashboard" look: a grand piano by a window
// wall (Oswald / Unsplash, Unsplash License), darkened into smoky glass. On first
// load it starts blurred and dim and comes into focus; each page switch blurs it
// briefly. While the mic records we drop the frosted-glass blur everywhere — it
// costs frame rate on cheap phones and the analysis needs the CPU.

let blurTimer = null;

export function setBackgroundPaused(value) {
  document.body.classList.toggle('lowfx', value);
}

/** Brief refocus of the photo, used on page switches. */
export function pulseBackground() {
  const body = document.body;
  body.classList.add('bg-soft');
  clearTimeout(blurTimer);
  blurTimer = setTimeout(() => body.classList.remove('bg-soft'), 260);
}

export function mountBackground() {
  if (document.querySelector('.bg-photo')) return;
  const photo = document.createElement('div');
  photo.className = 'bg-photo';
  photo.setAttribute('aria-hidden', 'true');
  document.body.prepend(photo);
  const shade = document.createElement('div');
  shade.className = 'bg-shade';
  shade.setAttribute('aria-hidden', 'true');
  photo.after(shade);

  // Start the load sequence once the photo is decoded, so it doesn't pop in late.
  const src = matchMedia('(max-width: 700px) and (orientation: portrait)').matches ? 'img/piano-room-900.webp' : 'img/piano-room-1920.webp';
  const img = new Image();
  const go = () => requestAnimationFrame(() => document.body.classList.remove('booting'));
  img.onload = img.onerror = go;
  img.src = src;
  setTimeout(go, 1200); // never hold the app on a slow image
}
