// A short burst of confetti from an element: for a Merit or Distinction, or a new
// best mark. Plain DOM and the Web Animations API; nothing at all in Still scenery
// or when the device asks for less motion.
import { still } from './settings.js';

const COLOURS = ['#ff6b4a', '#ffb35c', '#3fd08a', '#5aa9ff', '#c06bff', '#ff5c9a'];

export function celebrate(from, pieces = 34) {
  if (!from || still()) return;
  const r = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height / 2;
  let left = pieces;
  for (let i = 0; i < pieces; i++) {
    const bit = document.createElement('i');
    const size = 6 + Math.random() * 6;
    Object.assign(bit.style, { left: `${x0}px`, top: `${y0}px`, width: `${size}px`, height: `${size * (Math.random() < 0.5 ? 1 : 0.45)}px`, background: COLOURS[i % COLOURS.length], borderRadius: Math.random() < 0.3 ? '50%' : '2px' });
    layer.append(bit);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 140 + Math.random() * 220;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const spin = (Math.random() - 0.5) * 900;
    bit.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx * 1.3}px), calc(-50% + ${dy + 320}px)) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 600, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' }).onfinish = () => { if (--left === 0) layer.remove(); };
  }
}
