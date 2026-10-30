# Stave (formerly Music Helper) — Product & Technical Plan (Draft v0.3)

> A piano practice companion that acts like a teacher between lessons, or instead of them for people who can't afford lessons.

---

## 0. Decisions so far (v0.2)

These came out of the Q&A. Where I disagree, the pushback is right below the table.

| Area | Decision |
|---|---|
| Founder | **Piano teacher**, building solo. You are customer #1, and your students are the first test group. |
| Audience | Everyone, with or without a teacher. **Core: teens 13–17.** |
| Market | **UK first.** Students sit **ABRSM and Trinity** exams. |
| Devices | Phone, tablet and laptop equally. Layout must adapt to all three. |
| Pianos | A mix of acoustic and digital, so **MIDI and microphone** are both required. |
| Priority | **Microphone checking, including chords, comes first.** |
| Student pain points | Not practising; **practising mistakes in**; slow note reading. |
| Checking | Strictness **adjustable per student**. Two modes: **Learn** (waits for the right note) and **Perform** (keeps going, reports at the end). |
| Anti-"practising mistakes in" | **Auto-loop failing bars** until 3 clean runs; **lock the tempo down** until accuracy is high. |
| Teacher tools | Assign pieces + goals, see practice logs, **hear recordings**, write lesson notes. |
| Learning path | Built-in course **+** AI tutor **+** students can set their own path. |
| Motivation | Streaks + daily goal, **leaderboards/friends**, practice reminders. |
| Score view | Scrolling line **and** page view; the user chooses. |
| Flashcards | Add **key signatures** and **intervals + chords**. |
| Look | **Dark smoky glass, after the "Glassy Dashboard V5" reel** (code.xr): a darkened photo of a grand piano by a window wall (Oswald on Unsplash, Unsplash License, credited in the app), frosted translucent panels with a thin light edge, white type, one blue accent, Geist. Sheet music and flashcard staves stay on light **paper** panels, because notation reads dark-on-light, like a book. Motion follows the reel: the photo goes from blurred to sharp on load; the top bar fades in and the dock slides in; panels rise and unblur one after another; on a page switch the old page blurs out and the photo refocuses; bars grow, sparklines draw and the goal ring fills. A floating glass tab bar on phones; a left dock with tooltips from 900 px. **Today is a dashboard** of the student's own data: streak, minutes this week, last check score, notes known, a 7-day practice chart with a goal line, today's plan, recent checks, pieces and the daily goal ring. The blur turns off while the mic records (performance). Reduced-motion users get no animation. Replaces the light Ascend look; the welcome screen and tagline stay. |
| Pricing | **Completely free during testing.** Premium switches on when you say so. |
| Accounts | **Username + password, no email** (Supabase, free tier: 50k monthly users per project). **Student and teacher roles**: a teacher makes a studio and gets a 6-character code; students join with it and the teacher sees each student's minutes, streak, recent checks and weakest bars (a summary computed on the student's phone, never their full history). Progress stays on the device first and syncs; sessions, checks and flashcards merge across phones; mic tuning stays per device. Sign-out wipes the device for shared iPads. Account deletion deletes everything. Setup: `supabase/README.md`; 35 row-level-security checks in `tests/db`. |
| Mic validation | **Recording kit** (Perform → Test lab): 12 labelled takes on a real piano, including deliberate wrong and skipped notes, scored on the spot and downloaded as a .zip; `tools/evaluate-kit.mjs` scores a kit and tunes the thresholds. The kit's first test exposed a real flaw: clicks or noise in time with the beat were accepted as notes; fixed with sustain and tonality guards (regression-tested). Thresholds stay as they are until real kits from several pianos agree. |
| Research | Competitors, USP and Grade 1→8 audit (Oct 2026) in `research/`; the combined shortlist is `research/SHORTLIST.md`. |

### Pushback
1. **Scope vs one person.** Mic chord checking is the hardest engineering in the app. On top of teacher recordings, leaderboards, an AI tutor, custom paths, two score views and two exam boards, that means nothing ships. **First version (v1):**
   - mic + MIDI checking with Learn/Perform modes
   - auto-loop + tempo lock
   - expanded flashcards, timer
   - teacher: assign + practice logs + lesson notes
   - one course from Initial grade to Grade 2

   **Later:** leaderboards, the AI tutor, custom paths, page view, recordings.
2. **The UK Children's Code covers everyone under 18**, not just under-13s. With teens as the core, you need high-privacy defaults and no design tricks that pressure kids into using the app.
   - **Leaderboards:** off by default, class-only (the teacher's students), no public profiles. Rank on *clean runs*, not minutes, because minute rankings reward leaving the timer running.
   - **Reminders:** no guilt-trip copy.
   - **Recordings of teens:** sensitive personal data. They need explicit consent and a retention limit.
3. **Exam content.** ABRSM/Trinity pieces belong to their publishers. Use the *grade structure*: scale requirements, sight-reading style and level-appropriate public-domain pieces. Say "follows the ABRSM/Trinity grade structure", never "official".
4. **Free now, paid later, only if the paywall exists from day one.** Every premium feature sits behind a remotely controlled flag, so "switch on premium" is a config change, not a rebuild.
5. **Animated background: cost and focus.** It's a small WebGL shader rendered at half resolution and ~30 fps. It pauses when the app is hidden and during mic recording, and shows a still frame for anyone with "reduce motion" on. Staves, flashcards and the keyboard sit on solid white panels so notes stay easy to read.

---

## 1. The verdict

**The idea can work. The version you described can't, at least not as a business.**

| Your feature | Verdict | Why |
|---|---|---|
| Note flashcards | **Commodity.** Necessary, but nobody pays for it. | Dozens of free apps already do this well. Treat it as a retention hook, not the product. |
| Practice timer | **Commodity.** | Any free timer app covers it. It's only valuable when it feeds into something else, like a teacher seeing your log or the app planning your next session. |
| "Photo of any piece → check my playing" | **Right instinct, wrong headline.** | It's the hardest feature to build. The error rate on phone photos of piano scores is high. And if the score is misread, the app tells the student they're wrong when they played it right. That kills trust on day one. |
| "Like a real music teacher" | **The real product.** None of your listed features delivers it yet. | A teacher isn't a flashcard deck plus a stopwatch. A teacher **decides what you practise next, catches what you can't hear yourself, and holds you accountable.** That layer is the product. |

**The market is crowded and well funded.** Simply Piano, Flowkey, Skoove, Yousician, Playground Sessions and Piano Marvel all already "listen and give feedback", with mic and MIDI, polished song libraries and big ad budgets. Annual pricing clusters around **$120–150/yr** ([HackerNoon comparison, Feb 2026](https://hackernoon.com/lite/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology), [ThePricer on Simply Piano, May 2026](https://www.thepricer.org/how-much-does-simply-piano-cost/)). If you launch "another app that listens to you play" on the App Store, you lose: they outspend you on ads and out-license you on songs.

**Where you can actually win** is the segment you named: **students who have a real teacher, plus self-learners who want something closer to a teacher than a game.** The incumbents are built for self-learners who play songs like a game. None of them is truly built around the teacher–student loop:

- The teacher assigns pieces and goals.
- The app coaches the student through the week.
- The teacher sees real data (what was practised, for how long, which bars keep breaking) before the next lesson.

That is a wedge with **free distribution**. Every teacher you sign up brings 10–30 students. Self-learners get the same coaching engine with a built-in curriculum standing in for the teacher.

> **Positioning:** *"The practice coach between lessons."* Not *"replace your teacher."*
> "Replaces a teacher" is a claim you'll lose. The app can't see posture, hand tension or wrist height, and those cause injury and plateaus. Teachers will actively warn students away from an app that claims to replace them. Make them your sales force instead.

---

## 2. What's missing for it to work "like a teacher"

A good piano teacher does seven things. Here's how each maps to the app:

| What a teacher does | In the app | Feasible? | Phase |
|---|---|---|---|
| **1. Plans your practice.** "This week: scales, bars 5–8 hands separately, then full run." | **Daily lesson plan** generated from your history: weak notes, worst bars, current tempo. *(Prototype has v0.)* | ✅ Easy | MVP |
| **2. Listens and corrects notes and rhythm** | Score-informed checking: wrong, missed and extra notes, early/late, tempo, rushing and dragging, notes released early. *(Prototype has it for MIDI.)* | ✅ MIDI: easy. ⚠️ Mic: hard | MVP / V2 |
| **3. Breaks hard passages down.** "Just bars 5–8, slowly, hands separate." | Loop a section, hands-separate mode, **progressive tempo** that earns speed by clean runs *(prototype has auto-tempo)*, "3 clean runs in a row" goals. | ✅ Easy | MVP |
| **4. Teaches musicianship:** dynamics, phrasing, pedalling, articulation | MIDI gives velocity (dynamics) and the sustain pedal (CC64), so both can be checked against score markings. Phrasing is roughly approximable. | ⚠️ Medium (MIDI only) | V2 |
| **5. Fixes technique:** posture, hand shape, fingering, tension | Fingering can be *suggested* on the score but not verified from audio. Posture needs a camera plus pose estimation, and is unreliable. **This is where the human teacher stays essential.** | ❌ Mostly out of reach | Teacher mode |
| **6. Builds foundations:** sight-reading, rhythm, ear, theory | Flashcards (have), timed sight-reading drills (new short excerpts), rhythm tapping, interval/chord ear training, bite-size theory. | ✅ Easy | MVP–V2 |
| **7. Keeps you accountable and motivated** | Streaks and goals *(have)*, weekly summary, **teacher dashboard**, recorded "performance" to send to the teacher, recital-style milestones. | ✅ Easy | MVP–V2 |

**Missing pieces that matter most, in order:**
1. **A curriculum.** Without a structured path (Week 1 → Week 52), self-learners churn. This is content work, not code. Budget for it.
2. **A teacher dashboard and assignments.** This is your differentiator and distribution channel.
3. **Section looping, hands-separate practice and progressive tempo.** This is what "practice" actually means. Playing straight through is not practice.
4. **A proper score engine** (MusicXML + two staves + chords). The prototype handles a single melody line only.
5. **Microphone support for acoustic pianos.** Many learners have no MIDI. But ship it only once it's accurate.

---

## 3. Sheet music: where scores come from (my advice)

**Don't make "photo of any score" the core feature. Do it in this order:**

1. **Built-in curated library (MVP).** Public-domain repertoire (Bach, Clementi, Czerny, Burgmüller, folk tunes) plus your own graded exercises, as **MusicXML** with fingering added. Every score is verified, so **the checker is never wrong because the score was wrong.**
   - Sources: Mutopia Project and other public-domain MusicXML. Check each file's license. "Public-domain composition" doesn't mean the *edition* is free; IMSLP scans of modern editions can be copyrighted.
2. **File import (MVP+).** Import MusicXML / MIDI / MuseScore exports. Teachers already have these. Cheap to build, and it unlocks the teacher channel.
3. **Photo scan / OMR (V2, behind a "confirm the score" step).**
   - The flow: photo → recognition → **show the recognised score, let the user fix it** → then practise. Never check playing against an unconfirmed scan.
   - Tech: run OMR server-side. **oemer** (MIT licence, deep learning) or **Audiveris** (AGPL — if you run modified Audiveris as a network service, you must publish your source; get legal advice) or a commercial SDK. Expect clean printed beginner scores to work, and handwritten or dense scores to fail.
   - Copyright: a user scanning *their own* book for personal practice is the norm for these apps. **Never let scanned scores be shared or published inside the app.** That's a takedown waiting to happen.
4. **Pop songs: think twice.** That's how incumbents win users, but it requires publisher licensing deals. That's expensive and slow, and a solo founder can't match them. Lean into teacher-assigned and classical/graded repertoire instead.

---

## 4. Technical reality check

### 4.1 "Is it right?": why this is more tractable than it sounds
The key design decision: **we're verifying, not transcribing.** We already know what the student *should* play. So instead of the very hard problem "what notes are in this audio?", we solve "did these expected notes happen, roughly when expected?" That's dramatically more robust, and it's how the prototype's analyser works:

1. **Align** played notes to score notes with a weighted edit distance (pitch decides; timing breaks ties for repeated notes).
2. **Fit the player's own tempo** by linear regression. A student who is steady but slow is told *"you're at 72, target 90"* instead of seeing every note marked late.
3. Judge each note against that fit: **early/late** (> ¼ beat), **cut short** (< half the value), **drift** (first-half vs second-half tempo = rushing or dragging).
4. Find the **worst bar** and turn the numbers into **one prioritised next step**: notes → rhythm → speed → polish. This is the "teacher voice".

### 4.2 Input: MIDI vs microphone
| | MIDI (USB/Bluetooth digital piano) | Microphone (acoustic or digital) |
|---|---|---|
| Accuracy | ~perfect: exact notes, timing, velocity, pedal | Single notes and 2–3 note chords: good in tests so far (§4.3). Dense, pedalled chords: harder. |
| Approach | Web MIDI / native CoreMIDI | **Score-informed verification** (§4.3); ML transcription (Spotify Basic Pitch) as a second opinion later |
| Pitfalls | Bluetooth MIDI latency; must calibrate | Room noise, piano tuning, device latency, pedal blur, metronome bleed |
| Plan | **v1** | **v1, top priority.** Prototype built, needs real-piano recordings (§4.3) |

### 4.3 Microphone chord checking: how it works (built in the prototype)
**The key idea:** the app knows what's written, so it checks "did these notes sound, roughly on time?" instead of transcribing blind. Steps (`app/js/micanalysis.js`, pure functions):
1. **Clean capture.** Phone echo cancellation, noise suppression and automatic gain are switched off. They're designed for voice and they wreck piano tone.
2. **Calibration**, once per piano and room, about 10 seconds:
   - room noise (warns if the room is too noisy)
   - speaker→mic delay, from 6 clicks
   - piano tuning, from a held A4 (old pianos are often 20–40 cents flat)
3. **Onsets.** Find where each note or chord starts from sudden jumps in the sound (spectral flux). Low-energy onsets (knocks, breaths) are ignored.
4. **Align onsets to the score's chords** with dynamic programming: cost = how much of the chord is missing + timing.
5. **Judge each written note** by the *new* energy at its harmonics after the onset compared with just before it, so held or pedalled notes don't count as re-played.
   - **Odd harmonics are weighted more** than even ones. That's how A5 played instead of A4 is caught as an octave error.
   - **A wrong note is only called** when a neighbouring semitone is clearly stronger than the written note, and isn't just an overtone of another chord note.
6. **Unclear ≠ wrong.** When the evidence is in between, the note is marked *unclear* and not counted against the student. A false "wrong note" on a correct performance is what kills trust.
7. Results feed the same analyser as MIDI: tempo fit, rushing/dragging, worst bar, one next step.

**Test results so far (synthetic piano audio, not real pianos).** Run `node tests/mic-synthetic.test.mjs`. It has 19 checks, and the sweep repeated them over 20 different random seeds (≈420 checks):
- **Correct runs come out 100% correct** across all seeds, including:
  - sustain pedal, background noise
  - a 30-cent flat piano (calibrated or not)
  - a quiet middle voice
  - 60 ms timing jitter
  - fast repeated notes
  - chords not played together (up to ~90 ms apart)
  - 54–100 bpm
- **Caught and named:**
  - wrong chord notes (E→F, C→D)
  - octave error (A5 for A4)
  - a chord note left out
  - a skipped chord with the pedal held
  - wrong and missed melody notes
- **When unsure, it says "unclear", not "wrong".** In the sweep that happened once (a very soft fast repeat). The student isn't penalised.
- **"Chord not played together"** is reported as coaching when the notes are ≳35 ms apart. It's best-effort: closer spreads can't be separated.
- **Calibration:** delay measured to ±5 ms, tuning to ±2 cents.
- **Known failure:** a very noisy room (noise louder than a normal practice room). Calibration warns about it.
- **Harder (Grade 5–8) textures**, correct runs, false alarms over 10 runs each:

  | Texture | False alarms |
  |---|---|
  | 5-note two-hand chords with left-hand octaves (with and without pedal) | 0% |
  | 16ths at 120 and 144 bpm | 0% |
  | Both hands in octaves | 0% |
  | Melody over pedalled accompaniment | 0% |

  Before the octave fix, the chords were at 27% and both-hands octaves at 50%.
- **Mistakes caught** in those textures:

  | Mistake | Caught |
  |---|---|
  | Wrong note inside a 5-note chord | 10/10 |
  | Left-out bass note | 10/10 |
  | Wrong note in a fast run | 10/10 (8 as "wrong", 2 as "missed") |
  | Wrong melody note over pedal | 7/10 |
  | **Wrong upper note of an octave** | **0–2/10** (known limit) |
- Dense pieces on the mic switch to cautious feedback ("Probably a wrong note…"), and the app suggests MIDI for full checking.

**What's still unproven:** real pianos, real phones and real rooms. Synthetic piano sound is cleaner than a real upright in a living room.
- **Next step (needs you):** record ~30 test clips on 2–3 phones and 2+ pianos: correct runs, deliberate wrong notes, with and without pedal, soft and loud. Score them in the **Test lab** and re-tune the thresholds (`THRESHOLDS` in `micanalysis.js`).
- **Known blind spot:** playing the octave *below* the written note can't be told apart from playing both. That will need the ML second opinion.

### 4.4 ⚠️ The iPad problem (big)
**Safari on iPhone/iPad does not support Web MIDI, and there's still no sign it will** ([caniuse](https://caniuse.com/webmidi), [WebKit bug 107250](https://bugs.webkit.org/show_bug.cgi?id=107250)). The iPad on the music stand is *the* dominant device for piano learners. So:

- A **pure PWA can't do MIDI on iOS.** In the prototype, iOS users get the on-screen keys only. That's useless for real checking.
- **Fix:** wrap the same web code with **Capacitor** for the App Store and bridge CoreMIDI with a native plugin or WKWebView polyfill. Mic input works in iOS Safari, so a PWA *can* do mic mode.
- Apple also rejects "just a website in a wrapper" ([App Store guideline 4.2, minimum functionality](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)). Native MIDI, offline mode and notifications get you past that.

**So "PWA for now" is fine for validating with Android/desktop users and teachers. Plan the Capacitor build from day one.** Don't write anything that only works as a PWA.

### 4.5 Architecture
```
┌───────────── Client (PWA now → Capacitor iOS/Android later) ─────────────┐
│ UI: Today · Cards · Timer · Play          (prototype: vanilla JS modules)   │
│ Score engine: MusicXML → internal model → render (OpenSheetMusicDisplay /   │
│               VexFlow for real scores; prototype draws a single stave)      │
│ Input: Web MIDI │ native CoreMIDI bridge │ mic → on-device pitch/onsets     │
│ Analysis: align → tempo fit → per-note verdicts → feedback (pure functions) │
│ Audio: sampled piano + metronome (WebAudio)                                 │
│ Storage: IndexedDB, offline-first, sync queue                               │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ sync (when signed in)
┌──────────────────────────────▼──────────────────────────────────────────────┐
│ Backend (Supabase/Firebase to start): accounts, teacher↔student links,      │
│ assignments, practice logs, run results, recordings (opt-in)                │
│ OMR service (V2): photo → MusicXML (oemer/Audiveris/commercial)              │
│ Payments: App Store / Play billing + Stripe for teacher plans on the web    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Will it work commercially?

### Honest answer
**As a self-learner app competing head-on with Simply Piano: very unlikely.** Customer acquisition is the killer. Music-learning ads are expensive, and incumbents have years of brand and A/B-tested onboarding.

**As a teacher-first coaching tool that also sells to self-learners: plausible, with a clear path.**

### Business model
| Plan | Price (draft) | Who |
|---|---|---|
| **Testing phase (now)** | £0, everything unlocked | Everyone. Premium features sit behind remote flags, ready to switch on |
| **Free** | £0 | Flashcards, timer, 3 library pieces, MIDI checking with limits |
| **Student** | ~£6/mo or ~£50/yr | Full library + curriculum, unlimited checking, lesson plans |
| **Teacher** | Free for up to ~5 students; ~£10–15/mo for unlimited | Dashboard, assignments, student logs, run reviews |
| **Teacher-linked student** | Discounted, or teacher-paid per seat | Students of a paying teacher |

Pricing *below* the ~$120–150/yr incumbents is deliberate. "Cheaper than lessons" is your pitch for self-learners. A private lesson commonly costs about as much per week as a year of the app.

### Unit economics to watch (validate, don't assume)
- **Store fees:** Apple/Google take 15% under their small-business programmes, otherwise 30%.
- **Retention is the business.** Learning apps typically lose most users within the first month. The teacher link is your retention lever, because a teacher checking their logs every week is accountability no streak can match.
- **North-star metric:** *weekly active practisers with ≥3 sessions/week.* Not downloads.

### Biggest risks
1. **Accuracy erodes trust.** One false "wrong note" on a correct performance and users leave. → Verified scores, "unclear" instead of guessing, and a real-piano test set before mic checking goes public.
2. **Content cost.** A curriculum and an edited library take months. → Start narrow: 8 weeks of absolute-beginner material, done really well.
3. **iOS MIDI.** → Capacitor build early (§4.4).
4. **Teens.** The core audience is 13–17, so the **UK Children's Code applies** (it covers under-18s): high-privacy defaults, data minimisation, no behavioural ads, no design that pressures kids into using the app, plus care with recordings and leaderboards (§0). Under-13s (US COPPA, parental consent) can wait until after launch.
5. **Solo-founder scope.** This plan is big. The MVP below is the whole job for the first ~3 months.

---

## 6. Roadmap

**Phase 0: Prototype (this repo, built)**
- **Read:** flashcard decks for notes, key signatures, intervals and chords, with spaced repetition; answer by playing.
- **Practise:** timer, goal and streak.
- **Perform:**
  - checking by MIDI, on-screen or computer keys, **and microphone, including chords and two-hand textures**, with calibration and a test lab
  - **Learn** and **Perform** modes, **bar drills** until 3 clean runs, **tempo lock**, hands separately, Gentle/Standard/Exam strictness
  - grand-staff notation with scroll and page views
  - **MusicXML / .mxl import**
  - rubato-aware timing; trills, mordents, turns and grace notes
  - musicality checks via MIDI: dynamics, voicing, pedal, staccato, legato
- **Today:** a daily lesson plan v0.
- **Offline PWA.**

**Phase 0.5: Prove the mic (next, needs your recordings)**
Real-piano test set (~30 clips) → re-tune thresholds → target: ≥95% of correct notes marked correct, under 2% of correct notes falsely marked wrong.

**Phase 1: MVP (validate with your own students first, then ~5 more teachers)**
- Initial–Grade 2 course following the ABRSM/Trinity grade structure, plus more public-domain pieces (as MusicXML)
- Premium feature flags (all on during testing)
- Accounts and sync; **teacher dashboard**: assign piece + tempo goal, set strictness, see practice log and run results
- Weekly student summary ("you practised 84 min, Ode to Joy went from 61 → 92")
- MIDI file import (MusicXML import is done)
- **Success = teachers keep assigning through the app after 4 weeks, and students practise ≥3×/week.** If teachers don't stick, stop and rethink before building more.

**Phase 2: App Store launch**
Capacitor iOS/Android with native MIDI · ML second opinion for mic (Basic Pitch, server-side for dense pieces) · sight-reading and rhythm drills · practice reminders · switch on premium.

**Phase 3: Expansion**
Photo scan (OMR) with a confirm step · recorded performances sent to teacher (with consent) · class leaderboards · student-set paths · AI tutor that plans and explains *why* (built on the structured analysis, never instead of it) · ear training/theory.

---

## 7. How the prototype works (draft walkthrough)

Run it: `cd app && python3 -m http.server 8000`, then open <http://localhost:8000>. Chrome/Edge on desktop or Android also lets you install it.

| Tab | What it does | Files |
|---|---|---|
| **Welcome** (first launch) | "Read. Practise. Perform.", three feature tiles, then setup: teacher or self-taught, level, exam board, daily goal. Re-open it from **Change your setup** on Today. | `js/welcome.js` |
| **Today** | Streak, minutes vs goal, notes mastered, and a **generated lesson plan**: warm-up scale at your earned tempo, flashcards weighted to weak notes, and the next un-mastered piece with its worst bar. Tap an item to jump there. | `js/app.js` |
| **Read** | Four decks.<br>• **Notes:** play the note.<br>• **Key signatures:** play the tonic.<br>• **Intervals:** play both notes.<br>• **Chords:** play the chord, any inversion.<br>You can also flip and grade yourself. Leitner boxes: missed cards come back more often. | `js/flashcards.js` |
| **Practise** | Start/Pause/Finish with a "what are you working on" tag. Daily goal, 7-day chart, streak, recent sessions. Timestamp-based, so it survives the phone locking or the app closing. | `js/timer.js` |
| **Perform** | **Pieces:** a scale, melodies, chords, the opening of Bach's Prelude in C (both hands), a Grade 6-style original study (shipped as MusicXML), or **your own MusicXML / .mxl**. Sheet music on a grand staff, in **Scroll** or **Page** view.<br>**Options:** hands together or separately; **Keys / MIDI** or **Microphone**.<br>**Perform mode:** count-in, play through, then a score, coloured notes, specific comments, tempo changes, musicality notes and **one next step**. A button offers to **drill the worst bar** until it's clean 3× in a row.<br>**Learn mode:** waits on each note or chord and shows the keys.<br>**Tempo lock:** caps the tempo at what you've earned; a teacher can unlock it.<br>**Strictness:** Gentle / Standard / Exam.<br>**Mic tools:** **Calibrate**, a level meter, and the **Test lab**, which scores uploaded recordings at their own tempo. | `js/check.js`, `js/analysis.js`, `js/score.js`, `js/render.js`, `js/musicxml.js`, `js/micanalysis.js`, `js/mic.js` |

Input works with a USB MIDI keyboard (Chrome/Edge/Android, including its sustain pedal), the on-screen keyboard, or the computer keyboard (`A W S E D F T G Y H U J K` = C4 up to C5, **Space = sustain pedal**). All data stays on the device (localStorage).

**Tests:** `node tests/mic-synthetic.test.mjs` (mic checking on synthetic piano audio), `node tests/analysis.test.mjs` (timing, rubato, ornaments, musicality, strictness, a 2,400-note piece), and `node tests/musicxml.test.mjs` (the importer, including .mxl), and `node tests/tuning.test.mjs` (per-user mic tuning).

**Per-user mic tuning.** After a mic check, "Did the app get a note wrong?" lets the student say a *missed/unclear* note was really played, or a *correct* one was really wrong. The app keeps the mic's evidence for that note and moves this device's "note present" bar to fit: it loosens only after 3 "it was right" reports and tightens after 2 "it was wrong" reports. The bar is bounded at 0.18–0.42 (standard 0.30), strict wins when the reports conflict, and each note counts once per take. "Wrong note" verdicts can't be overruled, because otherwise a student could tap their mistakes away. The tuning is stored on the device only, never uploaded, and "Reset tuning" is in the mic panel. Limits: one tuning per device, not per piano; and a student can still make the app looser by falsely marking quiet notes as played, so later the teacher should see the tuning level.

**Known prototype limits:**
- **Mic:** tested on synthetic audio only. It can't catch a wrong or left-out *upper* note of an octave, or a note hidden on the bass's overtones.
- **Notation:** no beams (flags only), no slurs or hairpins drawn (slurs *are* checked), no cross-staff notes.
- **MusicXML:** time-signature changes are only warned about; D.C./D.S. jumps aren't followed.
- **Missing features:** no accounts or teacher dashboard; synth instead of sampled piano.
- **Platforms:** iOS has no MIDI (see §4.4, but the mic works there); Bluetooth-MIDI latency isn't calibrated yet.

---

## 8. Open questions for you
1. **Test recordings:** can you record the ~30 mic test clips (§4.3)? That decides whether mic checking is ready.
2. **First testers:** how many of your own students would use it for 4 weeks? Ask a couple of teacher friends too.
3. **Course:** you're the teacher, so you'll write the Initial–Grade 2 path. Which pieces and exercises do you already use?
4. **Scope:** do you accept the v1 cut in §0? Leaderboards, the AI tutor, custom paths, page view and recordings all come after v1.
