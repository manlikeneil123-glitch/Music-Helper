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
