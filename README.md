# Music-Helper
A tracker for your music progress

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
