#!/usr/bin/env node
// UI audit in a real browser, fresh profile each run: every tab and page at phone widths
// (320, 375, 390) and desktop, in Night and Day. Flags unnamed controls, a control
// inside a control, sideways scrolling and clipped text.
//
//   (cd app && python3 -m http.server 8765) &
//   node tools/ui-audit.mjs [http://localhost:8765/]
//
// Needs Playwright with Chromium. PLAYWRIGHT=/path/to/playwright/index.mjs if it isn't
// resolvable from here.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.argv[2] ?? 'http://localhost:8765/';
const WIDTHS = [320, 375, 390, 1280];
const TABS = ['today', 'cards', 'practice', 'play', 'exam', 'account'];
const PAGES = ['privacy.html', 'terms.html', 'copyright.html', 'help.html', 'accessibility.html', 'consent.html'];

function audit() {
  const out = [];
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || el.labels?.[0]?.textContent || el.title || el.textContent || el.getAttribute('placeholder') || el.value || '').trim();
  const where = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}`;
  for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch]')) {
    if (!visible(el) || el.closest('[aria-hidden=true]')) continue;
    if (!name(el)) out.push(`unnamed control ${where(el)}`);
    if (el.parentElement?.closest('button, a[href]') && el.matches('button, a[href], input, select')) out.push(`control inside a control ${where(el)}`);
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px > ${innerWidth}px)`);
  for (const el of document.querySelectorAll('main *, header *, nav *')) {
    // Visually hidden on purpose (screen-reader-only labels) is fine.
    if (el.getBoundingClientRect().width <= 1) continue;
    if (!visible(el) || !el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.push(`clipped text ${where(el)}: "${el.textContent.trim().slice(0, 40)}"`);
  }
  return out;
}

const browser = await chromium.launch();
const problems = new Map();
for (const theme of ['night', 'day']) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('stave:theme', t); localStorage.setItem('stave:still', 'on'); } catch { /* */ } }, theme);
    const page = await ctx.newPage();
    const note = (where, list) => list.forEach((p) => { const key = `${where}: ${p}`; problems.set(key, [...(problems.get(key) ?? []), `${theme} ${width}`]); });
    await page.goto(BASE);
    await page.waitForTimeout(800);
    note('welcome', await page.evaluate(audit));
    await page.click('#w-start');
    note('setup', await page.evaluate(audit));
    await page.click('#w-form button[type=submit]');
    for (const tab of TABS) {
      if (tab === 'account') await page.click('#top-avatar');
      else await page.click(`.tabbar [data-tab=${tab}]`);
      await page.waitForTimeout(400);
      note(tab, await page.evaluate(audit));
    }
    for (const p of PAGES) {
      await page.goto(new URL(p, BASE).href);
      note(p, await page.evaluate(audit));
    }
    await ctx.close();
  }
}
await browser.close();
for (const [p, where] of problems) console.log(`${p}  [${where.join(', ')}]`);
console.log(problems.size ? `\n${problems.size} problem(s)` : 'UI audit: no problems');
process.exit(problems.size ? 1 : 0);
