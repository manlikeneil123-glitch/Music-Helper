# App Playbook

A reusable checklist for building and running a consumer app: web, PWA or native. It is written for an AI coding agent working in any codebase. It was distilled from building a real app end to end (auth, social features, AI features, themes, haptics, legal pages, releases). Every rule here came from something that actually broke, confused users, or was asked for.

## How to use this playbook (agents, read first)

1. **Read the project before applying anything.** Find its stack, router, theme system, data layer, and how it deploys. Use the project's own names. The patterns below are shapes, not drop-in files.
2. **Apply only what fits.** Skip a section that clearly doesn't apply (no backend means no RLS). Never skip one because it is tedious.
3. **Ask before big or irreversible choices.** Put the questions to the owner in one batch, with a recommended option first. Recommended answers are marked **(default)**.
4. **Each section has:** Rules (MUST / SHOULD), Patterns (short code), Done when (a checklist you can verify), and Pitfalls (mistakes already made once).
5. **Write down decisions.** When the owner chooses something, record it where the next session will find it, such as the project's agent notes, CLAUDE.md or AGENTS.md. Undecided work gets re-litigated and decided work gets undone.

---

## 1. Working with the owner

**Rules**
- MUST ask before starting anything with real design or product choices. Ask 1 to 4 short multiple-choice questions, recommended option first. Don't ask what the code can answer.
- MUST NOT restyle, rename or remove what the owner already likes unless asked. A "full redesign" that the owner then rejects costs a revert and their trust. When in doubt, add an option rather than replacing.
- MUST NOT delete features to simplify. Tuck rarely used ones into one "More" place and keep the data.
- SHOULD let the owner try changes before they go live. Use a preview build, a demo-data page, or a staging deploy. Then ship when they say so, or ship each tested batch if they asked for that during a long run.
- SHOULD shortlist first for big new features: research, give a list of options with one line each, and let the owner pick. Build only what was picked.
- MUST report honestly. Say what was verified, what only ran against fake data, and what needs a real device or real account. Never imply a test you didn't run.
- SHOULD save progress notes early in long runs. Usage limits, crashed sessions and context loss happen. The next session should resume from notes, not restart.
- SHOULD prefer free services. If something needs the owner to set it up (an API key, a dashboard toggle), give exact numbered steps. Never enter their secrets or passwords yourself.

**Done when**
- [ ] Every product or design decision in this change was either asked about or follows a recorded earlier decision.
- [ ] The final report lists what is verified, what is unverified, and what the owner must do.

---

## 2. Release process

**Rules**
- MUST bump the version and add a changelog entry for every release, in plain words written for users. Keep the version in one place and copy it to the manifest and package files with a script.
- MUST apply database changes **before** deploying code that depends on them. A client that selects a column that doesn't exist yet can blank a whole screen.
- MUST verify the deploy actually went live. Fetch the live `index.html`, or a build hash, from every production URL and compare it with the local build.
- MUST run before every commit: type check, tests, a scan for leftover test code (see §19), and an emoji/ellipsis scan if those rules apply (§8).
- SHOULD script the whole release (`ship.sh`): seed off, checks, commit, build, deploy to each target, compare hashes. Scripts in temp folders vanish, so keep a copy in the repo or the agent notes.
- SHOULD show users what's new as a one-line notice they can tap, never an automatic pop-up. Group releases and show the latest few, then "Older versions".
- SHOULD write commit messages that say what changed for users and anything deliberately left out.

**Pattern: live hash check**
```sh
A=$(md5sum dist/index.html | cut -c1-32)
for url in https://prod.example.app/ https://mirror.example.app/; do
  B=$(curl -s "$url" | md5sum | cut -c1-32); [ "$A" = "$B" ] || echo "MISMATCH $url"
done
```

**Pitfalls**
- Bundlers cache environment variables. After changing a public env var, rebuild with the cache cleared (for example `expo export --clear`), or the old value ships.
- Bursts of probing requests against production (`/.env`, `/.git/config`) can trigger the host's bot checkpoint and lock you out for minutes.

---

## 3. Security

**Rules**
- MUST keep secrets off the client. Anything in a public env var (`EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, `VITE_*`) is public. Only publishable keys go there: the anon key, the captcha site key.
- MUST let the owner set secrets themselves (server API keys, OAuth secrets, captcha secret, database password). Give them the exact dashboard path.
- MUST turn on row-level security (or the backend's equivalent) for every table, with policies scoped to the owner of the row. Shared data (friends, groups) goes through explicit membership checks.
- MUST revoke execute on database functions from `public` and `anon` by default. Grant only what a signed-out user truly needs, and review this on every new function.
- MUST set `search_path` on security-definer functions, and check `auth.uid()` inside them.
- MUST put bot protection (a captcha) on sign-up, sign-in and password reset, and enforce it on the server, not just render it.
- MUST verify JWTs on server functions unless the URL itself is the credential (a per-user import link). Then use long random tokens and let the user rotate them.
- SHOULD store users' own third-party keys (for example their AI key) server-side. Let the client read only a masked hint (the last 4 characters), and give them a one-tap disconnect.
- SHOULD know the auth rate limits. A class or office behind one IP can hit per-IP sign-in limits, so raise them if the audience shares networks.
- SHOULD add indexes on every foreign key, and check slow functions once real data exists.
- SHOULD keep an audit habit: list functions callable by `anon`, tables without RLS, and buckets that are public.

**Pattern: Postgres function defaults**
```sql
create or replace function do_thing(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  -- only touch rows owned by auth.uid()
end $$;
revoke execute on function do_thing(uuid) from public, anon;
grant execute on function do_thing(uuid) to authenticated;
```

**Done when**
- [ ] No secret appears in the client bundle (grep the built JS for key prefixes).
- [ ] Every table has RLS on; every new function has explicit grants.
- [ ] The captcha is enforced server-side.

---

## 4. Privacy and legal pages

**Rules**
- MUST ship a **Privacy Policy**, **Terms**, a **Support / help** page (with crisis helplines if users could be vulnerable), and an **Accessibility statement**. Link all of them from sign-up, Settings and the footer of public pages. They must be readable without signing in.
- MUST write them in plain words and keep them true to the code. Each time a feature touches data (a new AI provider, a new sharing switch), update the policy in the same change.
- MUST collect the minimum. Keep on the device whatever doesn't need a server (local files such as uploaded PDFs, results only the user sees), and say so.
- MUST give users their rights **in the app**: download my data (JSON or CSV export) and delete my account (with confirmation, removing their rows and auth record). Email-only deletion is the bare minimum; app stores require in-app deletion.
- MUST NOT sell data or run ads unless the owner explicitly decides to, and then disclose it.
- SHOULD apply a children's-code standard if under-18s can sign up (UK Age Appropriate Design Code, COPPA in the US): high-privacy defaults, sharing off by default unless the owner decides otherwise, no nudges to share more, no dark patterns, minimum age stated (often 13), and a page for parents, carers and teachers.
- SHOULD keep a **public "promise" page**: what the app will never do (no ads, no selling data, no paywall on core features), only if true.

**Privacy policy sections** (adapt every line to the real app):
1. Who we are, and how to contact us
2. What we collect (account, what you log, device and technical data)
3. Health and body data, if any (special category data, with explicit consent and why it's needed)
4. Photos and files (where they go, how long they're kept; say if they are never stored)
5. Why we use it: the legal bases (contract, consent, legitimate interests)
6. Who can see what: private by default, what friends or groups see, and the switches that control it
7. Who helps us run it (processors: hosting, database, email, push, AI providers), with links
8. AI features: what is sent, to whom, whether it's the user's own account or key, and whether it's used for training
9. Connected apps and assistants (OAuth or MCP connectors) and how to revoke them
10. What stays only on your device
11. How long we keep it (retention, including logs and short-lived tokens)
12. Your rights (access, export, correct, delete, object) and how to use them
13. Young people
14. Security
15. Changes to this policy (and how users are told)

**Terms sections:** Agreement · Who can use it (age) · Health and safety ("not medical advice", stop if it hurts, see a professional) · Using it fairly (no harassment, no cheating leaderboards) · Your content (you own it; licence to run the service) · The service (free, provided as is, can change) · Ending your account · Liability · Law and changes.

**Accessibility statement sections:** What we aim for (WCAG 2.2 AA) · What works today · Settings that make it easier · Known limits (be honest) · How to report a problem · About this statement (self-assessed, with the date).

**Done when**
- [ ] All four pages exist, are linked, and describe the current data flows.
- [ ] Export and delete work from Settings and are tested against a real account.

---

## 5. Accessibility (WCAG 2.2 AA)

**Rules**
- MUST meet 4.5:1 contrast for text (3:1 for large text and UI outlines) in **every** theme and mode. Run an automated token audit whenever colours change. Text drawn over a moving or animated background must pass against its brightest frame; dim the background if needed.
- MUST label every control (`accessibilityLabel` / `aria-label`). Icon-only buttons included.
- MUST show a visible focus ring for keyboard users.
- MUST allow zoom: no `maximum-scale=1` or `user-scalable=no`.
- MUST give each screen a document title (web) and mark headings as headings.
- MUST hide decorative art from screen readers (`aria-hidden`, `importantForAccessibility="no-hide-descendants"`).
- MUST respect reduced motion (see §7), and offer an in-app "still scenery" switch for people who want calm without changing system settings.
- SHOULD offer text size and spacing settings.
- SHOULD keep tap targets at least 44×44.
- SHOULD never truncate meaningful text: wrap instead (§8).
- SHOULD use a "secondary text" colour that still passes AA for anything people must read; reserve a fainter "muted" colour for decoration only.

**Pattern: contrast check**
```ts
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// Test every text token against every surface token, in every theme: contrast(t, s) >= 4.5
```

**Done when**
- [ ] The token audit passes for all themes.
- [ ] A DOM pass finds no unnamed buttons, no overlapping text at 320 to 390 px, and no clipped labels.
- [ ] The statement page is honest about what's left.

---

## 6. Haptics (vibration)

What each platform can actually do:

| Platform | How | Limits |
|---|---|---|
| Native (iOS/Android app) | the platform haptics API (for example `expo-haptics`) | full range |
| Android browser / installed PWA | `navigator.vibrate(ms or pattern)` | pulses under about 20 ms often don't spin the motor; use 20 ms or more |
| iPhone browser / installed PWA | no vibration API. iOS 17.4+ plays the system tick when an `<input type="checkbox" switch>` is toggled | observed: newer iOS versions only tick when the user's **finger** lands on the real switch, not when a script toggles it. Timed buzzes (a timer ending, breathing beats) can't vibrate on iPhone web at all |

**Rules**
- MUST route every haptic through one module (`tap(kind)` for presses, `buzz(pattern)` for patterns), so behaviour, settings and fallbacks live in one place.
- MUST give users a Vibration on/off switch, saved on the device.
- MUST be honest in Settings about what this device can do ("Vibration", "Light tick only", or "Not available").
- SHOULD give iPhone web users the tick by putting an invisible real switch over small controls (buttons, tabs, checkboxes), so the finger lands on it. Over list rows, cover only the tick area so scrolling still works. Skip it inside sideways scrollers, or swipes get swallowed.
- SHOULD avoid a double tick: if the overlay ticked within about 200 ms, `tap()` does nothing.
- SHOULD keep haptics meaningful: selection changes, completing something, a set logged. Not every scroll or hover.

**Pattern: one haptics module**
```ts
let enabled = readSetting('haptics') !== 'off';
const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const PATTERNS = { selection: 20, light: 22, medium: 30, heavy: 40, success: [24, 60, 32] };

export function tap(kind: keyof typeof PATTERNS = 'light') {
  if (!enabled) return;
  if (isNative) return nativeHaptics(kind);
  if (canVibrate()) return navigator.vibrate(PATTERNS[kind]);
  if (isIosWeb() && Date.now() - overlayTickedAt > 200) toggleHiddenSwitch(); // older iOS only
}
// iOS web, newer versions: render <input type="checkbox" switch> with opacity ~0.01
// over the control; the user's own tap on it plays the tick.
```

**Done when**
- [ ] Every press feedback goes through the module.
- [ ] The setting works.
- [ ] Tested on a real Android phone and a real iPhone. If you couldn't, say so.

---

## 7. Motion, transitions and loading

**Rules**
- MUST respect `prefers-reduced-motion`, and add an in-app "Still scenery" or "Transitions" switch. When it's on, animated backgrounds hold one frame and page changes become a short fade.
- MUST show skeletons that match the layout while loading, not spinners (spinners only inside buttons).
- MUST keep the UI responsive to fast double taps during a transition: queue them and run them under the same transition. Don't drop them and don't stack transitions.
- SHOULD use optimistic updates for taps (tick a set, toggle a task): update the cache at once, send in the background, roll back with a message on error.
- SHOULD prefetch the main tabs after first paint, so the first visit doesn't build the screen mid-transition.
- SHOULD give every press visible feedback (a slight sink and dim). Hold it for at least about 110 ms so quick taps still show.
- SHOULD use a few named easing curves and durations app-wide. Big moves take about 600 to 750 ms; small UI takes about 150 to 320 ms. A good pair: `cubic-bezier(0.65,0.05,0,1)` for big moves and `cubic-bezier(0.19,1,0.22,1)` for reveals.
- SHOULD give page-change transitions a reason: tab changes get the signature move, deeper screens a quick slide.
- SHOULD keep the very first launch fast and consistent: a static splash in the HTML that hands over to the same frame in the app, with no flash of the wrong theme (§9).

**Pitfalls**
- On iOS Safari, a leftover `transform` (even `translateX(0)`) on an ancestor of a scroll view can stop touch scrolling. Remove transforms at rest.
- Full-screen overlays parked off-screen reappear when the iOS keyboard resizes the viewport. Mount them only while visible.
- Hidden browser tabs and preview panes may not fire `requestAnimationFrame` or `ResizeObserver`. Use sensible initial sizes and don't depend on them for layout.

**Pattern: one reduced-motion check**
```ts
export const useStill = () => useSetting('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## 8. Copy and content rules

**Rules**
- MUST NOT end text in "…". Wrap long text. Truncate only short labels inside fixed boxes, and never with an ellipsis placeholder.
- MUST NOT use emoji in the UI, notifications or reminders unless the owner wants them. Use a proper icon set. Scan for emoji before release.
- SHOULD say less: no intro paragraphs explaining a screen. Keep only hints that change what someone does, plus safety, privacy and set-up instructions.
- SHOULD use one name per feature everywhere (tab, title, settings, help).
- MUST word health and safety content cautiously: "not medical advice", no specific risky numbers for young users, and a link to help. Never push weight loss or calorie restriction. Offer a "hide calorie numbers" switch if food is tracked.
- MUST check provenance and licence before bundling third-party text, images, data or fonts:
  - A licence badge only covers what the uploader owns. Read the source's issues for ownership doubts. For example, a "public domain" exercise database whose photos are of unknown origin is unsafe.
  - Share-alike data (for example Open Food Facts, ODbL) can be looked up live, but not copied into your database.
  - CC BY / BY-SA content needs credit in the app (for example in Help → Credits).
  - Fonts under the SIL OFL need their licence file shipped next to them. Subsetting is fine; don't use the font's Reserved Font Name.
  - Never bundle stock photos, other sites' assets, or strangers' faces. Draw or build your own instead.
- SHOULD write guides and how-tos yourself rather than copying.

---

## 9. Theming

**Rules**
- MUST drive all colour, type, radius and shadow from tokens. No raw hex values in components.
- MUST support Day and Night. Save the choice on the device for instant start-up, and on the account so it follows the user.
- MUST avoid a flash of the wrong theme: a tiny inline script in the HTML head reads the saved theme and sets `data-theme`, the page background and `<meta name="theme-color">` before the app loads.
- SHOULD give semantic colours one meaning each: success, warning, danger, highlight. One accent for primary actions and progress. Selection shown by inversion, not the accent.
- SHOULD, if there are several "looks" (styles), compute a theme object from (mode × style) and give each look a capability flag (for example `flat: no ornament`) instead of checking style names everywhere.
- MUST keep decorative art off text on phones: draw it only at widths where there's room, and reserve space in layouts.
- SHOULD load heavy look-specific assets (fonts, WebGL, libraries) only when that look is chosen.
- SHOULD contrast-check each look × mode (§5).

**Pattern: no-flash boot script (web)**
```html
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('theme')||'light';
d.setAttribute('data-theme',t);var bg=t==='dark'?'#0B0D14':'#F4F8FC';d.style.background=bg;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',bg);}catch(e){}})();</script>
```

---

## 10. Accounts and sign-in

**Rules**
- SHOULD prefer email one-time codes or magic links, with passwords optional. If there are passwords: one password box with a show button (no "confirm password"), and a clear reset flow.
- One-time code screen:
  - One box per digit, with paste and the phone's "from Mail" autofill supported (one real hidden input over the boxes, `autocomplete="one-time-code"`).
  - Checks itself once all digits are in.
  - A wrong code shakes the boxes red, then clears them for another try.
  - A right code turns green and moves on.
  - "Resend in 0:30" countdown.
- MUST show friendly errors in plain words. Never show raw server messages.
- MUST protect sign-up and sign-in with a captcha (§3).
- SHOULD add "Continue with Google/Apple" only through free tiers, and only once the provider is configured. Hide the button until it works.
- MUST guard against "empty data" during a session hiccup. Before concluding "this user has no plan, show the setup quiz", confirm the session is valid. A failed token refresh once sent real users to setup, which then overwrote their data. Offer a retry screen instead.
- SHOULD confirm before replacing or deleting anything big, and keep a server-side backup copy (for example a before-delete trigger into a backups table) for the most valuable user data.
- SHOULD clear all caches and local stores when the account changes on a device.

---

## 11. Notifications and nudges

**Rules**
- MUST make every notification opt-in and switchable by type. Provide quiet hours (for example 22:00 to 07:00 by default for teens).
- SHOULD keep nudges gentle and rare: no guilt, no streak-loss threats. Nothing pops up by itself on opening the app; use a one-line notice instead.
- SHOULD use Web Push (VAPID) for PWAs. Be clear that iPhone web push only works for installed (Home Screen) apps.
- MUST know platform limits and not fake them. For example, a web app can't reliably keep a live timer on the lock screen. Say so, and don't ship a hack.
- SHOULD let notification text stand alone (no emoji, clear action) and open the right screen when tapped.

---

## 12. PWA, install and offline

**Rules**
- MUST ship a manifest (name, icons at all sizes plus a maskable one, theme colour, start URL, display standalone) and app icon shortcuts for the top actions.
- SHOULD show an install coach card explaining Add to Home Screen per platform, dismissible and shown once.
- SHOULD show an offline banner when the connection drops, keep cached screens readable, and retry writes when back.
- SHOULD persist the query cache to local storage, so screens open instantly (§13).
- SHOULD make the site readable by AI agents and search engines: `robots.txt`, `sitemap.xml`, `llms.txt`, readable text injected into the static HTML, and Markdown versions of public pages (for example via `Accept: text/markdown` negotiation in edge middleware).
- SHOULD offer a free custom domain only once DNS actually resolves; check it before announcing.

---

## 13. Performance

**Rules**
- MUST persist the data cache (for example the React Query persister) with a max age (about 24 h) and clear it on sign-out or account change. Cached data must be JSON-safe (no Date, Map or Set), or it breaks after restore.
- MUST lazy-load heavy, optional code (3D engines, PDF tools, barcode decoders) with dynamic `import()`, so users who never open it never download it. Check the build splits it into its own chunk.
- SHOULD prefetch main routes after first paint, and use optimistic mutations with fire-and-forget invalidation.
- For animated or WebGL visuals:
  - one shared renderer, never one WebGL context per object (browsers allow only a handful)
  - draw small objects once and reuse the picture; draw each kind once per frame and copy it
  - visibility from `IntersectionObserver`, not measuring every frame
  - cap the frame rate (20 to 30 fps for ambient motion), render backgrounds at reduced resolution, and pause while scrolling, while hidden, and when reduced motion is on
- SHOULD add database indexes for foreign keys and hot filters, and run a scale check when the user count grows.
- SHOULD give the dev server enough memory (for example `NODE_OPTIONS=--max-old-space-size=8192`) if server rendering bundles large libraries.

**Pattern: pause animation while scrolling**
```ts
let scrollingUntil = 0;
addEventListener('scroll', () => { scrollingUntil = performance.now() + 200; }, { passive: true, capture: true });
function frame(now: number) {
  raf = requestAnimationFrame(frame);
  if (document.hidden || now < scrollingUntil || now - last < 33) return;
  last = now; draw(now);
}
```

---

## 14. Data and the backend

**Rules**
- MUST version schema changes as numbered migration files in the repo. Write them to be safe to re-run (`if not exists`, `drop constraint if exists` before re-adding).
- SHOULD test non-trivial SQL locally before applying it. For example, PGlite runs real Postgres in Node: stub `auth.uid()` and the roles.
- MUST apply migrations before deploying dependent code (§2). Where possible, make the client tolerate the old schema for one release (fall back if a column or function is missing).
- MUST keep tables when cutting a feature: hide the UI, keep the data.
- MUST set up backups. Free tiers often have none, so add a scripted dump (all public tables plus auth users) on a schedule, keep the last N copies, log OK or FAILED, and test a restore.
- SHOULD validate inputs in the database too: CHECK constraints, triggers for minimums.
- SHOULD paste serverless function code as one file when the dashboard is the only deploy path. Hash-check the live code against git before and after replacing it.

---

## 15. AI features

**Rules**
- SHOULD let users bring their own key or account for AI (for example a free Google AI Studio or OpenRouter key). That keeps the app free and the user in control. Store keys server-side (§3).
- MUST ground AI estimates in real data. For example, ask the model for items and amounts, then compute numbers from a nutrition table rather than trusting the model's totals.
- MUST make it robust:
  - try a preferred model first, fall back to others (fetch the provider's current free-model list rather than hard-coding names)
  - start a second attempt if the first is slow, and take the first good answer
  - parse leniently
  - show progress, and let the user correct the result (adjust amounts, remove items, "scan again" with a hint)
- MUST disclose in the privacy policy what is sent, to whom, and whether it's used for training.
- SHOULD keep AI optional: every AI feature has a non-AI path (search, type it in, barcode).

---

## 16. Settings and personalisation

**Rules**
- SHOULD put each area's settings behind a gear on that screen, keeping the main Settings page light. Keep Settings searchable so every option is still findable.
- MUST include: theme (Day/Night), look (if several), vibration, still scenery / reduced motion, transitions, notifications, privacy and sharing switches, connected apps, account (export, delete), legal links.
- SHOULD let users hide whole areas they don't use ("What you use"). Hidden areas drop from tabs and home, but nothing is deleted.
- SHOULD offer text size, spacing, tab order and an accent hue if the design allows.
- SHOULD let users edit their home screen widgets in place (add, remove, reorder with arrows; drag optional). Give sensible defaults.

---

## 17. Onboarding and motivation

**Rules**
- SHOULD ask at most one question on first run (what do you want to use?), then go.
- MUST put a skip link on every setup step, and use sensible defaults when skipped.
- SHOULD never auto-start tours. Offer "Show me around" in Settings, and a Help "i" button on every screen.
- SHOULD reach the core action within one tap of opening (for example a "Next up" card).
- SHOULD make streaks fair and kind: rest days count, freezes cover misses, a pause option, and no shaming. Store streak rules server-side, with history, so changing a rule doesn't rewrite the past.
- SHOULD make social features opt-in and safe (§18): friends, groups, shared goals, a live "studying now" view.

---

## 18. Safety (especially for young users)

**Rules**
- MUST let users report and mute in any chat or social feature, and block friends.
- MUST provide a support page with helplines (crisis, eating disorders, mental health) for the app's countries, linked from health-related screens.
- MUST avoid harmful framing: no weight-loss pushing, a "hide calorie numbers" switch, and cautious exercise advice for under-18s. Cite reputable sources (for example national health service guidance and sports-medicine consensus papers) and check the links.
- SHOULD apply quiet hours and gentle nudges by default for teens (§11).
- SHOULD ask for an age band (not an exact birthday) if you need age for safety, and use it only for safety defaults.

---

## 19. Testing and verification

**Rules**
- MUST run the type check and tests before every commit.
- MUST check UI at phone widths (320, 375, 390) and desktop, in every theme × mode, for:
  - overlapping or clipped text
  - unnamed controls
  - contrast
  - nested interactive elements (no button inside a button)
- SHOULD capture screenshots with a headless browser using a **fresh profile**, so leftover local storage (old layouts, shuffle settings) doesn't skew results. Enable software WebGL (`--use-angle=swiftshader`) for 3D. Use long timeouts and few page loads against slow dev servers.
- MUST mark temporary test code, such as a dev seed with fake data or an auth bypass, with a marker like `TEMP-DEV`, and have the release script refuse to ship if the marker or the seed file is present.
- MUST say clearly what couldn't be tested (real devices, real accounts, real payments or keys, real camera, real push).

**Pattern: leftover guard (in the release script)**
```sh
if grep -rn "TEMP-DEV\|devSeed\|devBypass" src app; then echo "LEFTOVER TEST CODE"; exit 1; fi
```

---

## 20. Release checklist (copy into each release)

- [ ] Owner decisions recorded; nothing they like was restyled or removed.
- [ ] Migrations applied and verified before the deploy.
- [ ] Type check, tests, leftover guard, emoji and "…" scan all pass.
- [ ] Contrast audit passes for every theme and mode.
- [ ] Checked at 320, 375 and 390 px and on desktop, in Day and Night and every look.
- [ ] Reduced motion, still scenery and vibration switches work.
- [ ] Privacy policy, terms and help updated for any data change.
- [ ] No secrets in the bundle; new functions have explicit grants.
- [ ] Heavy features lazy-loaded; no new jank on scroll.
- [ ] Version bumped, changelog written in plain words.
- [ ] Deployed to every target; live hashes match.
- [ ] Final report: verified / not verified / owner's steps.
