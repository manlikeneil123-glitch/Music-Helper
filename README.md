# Stave
Piano practice that gets you exam-ready. (Repository: Music-Helper.)

## Prototype
A piano practice companion PWA: note flashcards, practice timer, and play-along checking with teacher-style feedback.

```sh
cd app && python3 -m http.server 8000   # open http://localhost:8000
```

See [PLAN.md](PLAN.md) for the product plan, commercial assessment and roadmap.

```sh
node tests/mic-synthetic.test.mjs   # microphone checking (synthetic piano audio)
node tests/analysis.test.mjs        # timing, rubato, ornaments, musicality, strictness
node tests/musicxml.test.mjs        # MusicXML / .mxl import
node tests/tuning.test.mjs          # per-user mic tuning
```

## Test on your phone

Every push to `main` or `claude/optimistic-newton-ctacsp` runs the tests and publishes `app/` to GitHub Pages:
**https://manlikeneil123-glitch.github.io/Music-Helper/** — open and install from this address. (If Pages is ever switched to *Deploy from a branch*, the root forwards to `/Music-Helper/app/` instead.)

Install it as an app:
- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **Android (Chrome):** open the link → menu → *Install app* (or *Add to Home screen*).

Once it's opened once, it works offline. The microphone needs HTTPS, which Pages provides. MIDI keyboards work in Chrome on Android; Safari on iPhone has no Web MIDI, so use the microphone or the on-screen keys there.

After an update, close and reopen the app twice: the first open fetches the new version in the background.

## Accounts

Username + password (no email), student and teacher roles, studio join codes. Off until
a Supabase project is connected: follow [`supabase/README.md`](supabase/README.md), then
fill in [`app/js/config.js`](app/js/config.js).

## Tuning the microphone on real pianos

1. On your phone: Perform → Microphone → **Calibrate**, then Perform → *Test lab* →
   **Recording kit**. Record the 12 takes (about 10 minutes; some ask for deliberate
   mistakes) and press **Download the kit**.
2. Score it, and search for better thresholds:
   `node tools/evaluate-kit.mjs mic-kit-YYYY-MM-DD.zip --tune`
3. Change `THRESHOLDS` in `app/js/micanalysis.js` only when several kits (different
   pianos, phones, rooms) agree. One piano can mislead.

## Tests

`node tests/<name>.test.mjs` for the analysis, MusicXML, mic, tuning and sync tests;
`sh tests/db/run.sh` for the account security rules (needs Postgres binaries).
