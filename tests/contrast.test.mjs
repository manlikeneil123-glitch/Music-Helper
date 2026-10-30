// Contrast audit (WCAG 2.2 AA): node tests/contrast.test.mjs
// Reads the colour tokens from styles.css for Night and Day, lays each glass surface
// over the worst point of the background photo, and checks every text colour on it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/styles.css', import.meta.url), 'utf8');
const block = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `missing ${selector}`);
  return css.slice(at, css.indexOf('\n}', at));
};
const tokens = (text) => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const night = tokens(block(':root'));
const day = { ...night, ...tokens(block(":root[data-theme='day']")) };

// The photo after each theme's filter and shade, measured from app/img/piano-room-*.webp
// (99.5th percentile brightest for Night, 0.5th darkest for Day). Re-measure if the
// photo, --photo-filter or --shade change.
const BACKDROP = { night: [95, 97, 98], day: [159, 162, 166] };

function parse(c, vars) {
  c = c.trim();
  const v = /^var\((--[\w-]+)\)$/.exec(c);
  if (v) return parse(vars[v[1]], vars);
  if (c.startsWith('#')) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  const m = /^rgba?\((.+)\)$/.exec(c);
  assert.ok(m, `can't read colour ${c}`);
  const parts = m[1].replace(/var\((--[\w-]+)\)/, (_, k) => vars[k]).split(',').map(Number);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}
const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
const lum = ([r, g, b]) => [r, g, b].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let n = 0;
const fails = [];
function check(theme, vars, text, bg, what, min = 4.5) {
  const ratio = contrast(over(parse(text, vars), bg), bg);
  n++;
  if (ratio < min) fails.push(`${theme}: ${what} is ${ratio.toFixed(2)}:1 (needs ${min})`);
}

for (const [theme, vars] of [['night', night], ['day', day]]) {
  const backdrop = BACKDROP[theme].concat(1);
  const surface = over(parse(vars['--surface'], vars), backdrop);
  const strong = over(parse(vars['--surface-strong'], vars), backdrop);
  // Straight on the photo: headings, ledes, fine print, links under the cards.
  // (Links there use --text-2 and an underline; full --link colour is for panels and pages.)
  for (const t of ['--ink', '--text-2']) check(theme, vars, `var(${t})`, backdrop, `${t} on the background`);
  // Help, privacy and other pages: plain --bg, no photo.
  for (const t of ['--ink', '--muted', '--link']) check(theme, vars, `var(${t})`, parse(vars['--bg'], vars), `${t} on a page`);
  // Inside glass panels (both strengths).
  for (const [name, bg] of [['panel', surface], ['strong panel', strong]]) {
    for (const t of ['--ink', '--muted', '--text-2', '--link', '--good', '--warn', '--bad', '--unclear']) check(theme, vars, `var(${t})`, bg, `${t} on a ${name}`);
  }
  // Tinted chips and bands: their text on their own tint over a panel.
  const tints = { '--t-green': 'rgba(95, 214, 143, 0.22)', '--t-blue': 'rgba(77, 141, 255, 0.24)', '--t-gold': 'rgba(242, 180, 90, 0.24)', '--t-red': 'rgba(255, 122, 122, 0.24)', '--t-violet': 'rgba(169, 155, 255, 0.22)' };
  for (const [t, tint] of Object.entries(tints)) check(theme, vars, `var(${t})`, over(parse(tint, vars), surface), `${t} on its tint`);
  // Buttons: the primary pill and the blue action button.
  check(theme, vars, `var(--on-brand)`, parse(vars['--pill-on'], vars), 'primary button text');
  check(theme, vars, '#ffffff', parse(vars['--accent-btn'], vars), 'accent button text');
  // UI outlines and focus rings need 3:1.
  check(theme, vars, `var(--accent)`, surface, 'focus ring / accent outline', 3);
}

assert.deepEqual(fails, [], `\n${fails.join('\n')}`);
console.log(`contrast: ${n} checks passed`);
