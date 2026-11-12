# Notes for agents working on Stave

Stave (repo: Music-Helper) is a piano practice PWA for UK teens doing ABRSM and Trinity
exams. Vanilla JS ES modules in `app/`, no build step, deployed to GitHub Pages by
`.github/workflows/pages.yml` after the tests pass. Accounts are optional (Supabase,
off until `app/js/config.js` has a URL and key). See README.md and PLAN.md.

Develop on the branch named in the session; never open a pull request unless asked.
Don't put model names in commits. Follow `docs/APP-PLAYBOOK.md`, minus the decisions below.

## Owner decisions (don't re-ask, don't undo)

| Date | Decision |
|---|---|
| 2026-10 | Name is **Stave**. (The glass-on-a-photo look was replaced in 2026-11, see below. Don't restyle without asking.) |
| 2026-10 | First run: a splash, then the setup questions (teacher, level, board/exam type, lesson day, strictness, goal) **with a Skip link**. Not cut down to one question. |
| 2026-10 | Day and Night themes. **Night is the default**; Day is a light frosted-glass look. |
| 2026-10 | Pieces-only exams (ABRSM Performance Grade, Trinity repertoire-only) are an **exam type** on the Exam tab (and in setup): 4 pieces, no scales, arpeggios, sight-reading or aural anywhere (plan, targets, mock, phases). |
| 2026-10 | **No captcha for now.** Revisit before accounts are opened to the public. |
| 2026-10 | Supabase over Firebase (50k MAU is per project). Usernames, no email verification yet. Roles: student and teacher. |
| 2026-10 | Recordings sent to a teacher auto-delete after 20 days. Performance Grade videos stay on the phone, never uploaded. |
| 2026-10 | Parent view: a private link the student can turn off, no parent account. |
| 2026-10 | Exam pieces: the student or teacher types their own 3 (or 4) pieces; no syllabus database. |
| 2026-10 | Deferred: F1 sight-reading generator ("later"). G5 photo-to-score: now built, see below. E5 camera hand hints: an experiment only, never a score. |
| 2026-10 | Streak: one rest day in any seven doesn't break it (playbook §17). Two missed days in a row, or two rest days within a week, do. |
| 2026-10 | **Minimalist** screens. Night still the default. (Sunset gradient glass replaced in 2026-11.) |
| 2026-10 | Keep **5 tabs** (Today, Read, Practise, Perform, Exam), each simplified. **No on-screen piano on Perform** (microphone or MIDI keyboard only); Read keeps it for answering flashcards. |
| 2026-10 | **No preset songs.** Pieces come from importing MusicXML or a teacher's shared scores. A C major scale stays hidden, only for the warm-up check and the mic test kit. |
| 2026-10 | Tutorial: an optional guided tour (offered after setup, replayable from Settings, never auto-started) plus a self-ticking Getting started checklist on Today. |
| 2026-10 | Flashcards swipe away (right = got it, left = missed it). Calibration is a guided wizard in plain words. |
| 2026-10 | **Under 13s:** neutral birth month + year at sign-up (nothing pre-selected, remembered on the device so it can't be retried). Under 13 = account saves nothing until a parent approves by emailed link, or their studio teacher approves; unapproved accounts deleted after 14 days. |
| 2026-10 | Sign-up has an **unticked** "I agree to the Terms and Privacy Policy" box; the server stores the terms version and time. Links are blue and underlined. Deleting an account is a button in Account, never "email us". |
| 2026-10 | **Stats page** behind Today's three numbers (Today stays minimal). Sign-in card folds to the mark when switching forms. (Tab bar restyled in 2026-11.) |
| 2026-10 | **Today's shelf** (after a perfume-shop reel): pieces in lit niches at the top of Today, plan and checklist below. Tap = zoom into the piece with Perform / Learn. Empty shelf = an add-a-piece niche; the warm-up scale stays hidden. |
| 2026-10 | **Photo scanning** (reverses the earlier G5 'not now'): Claude Haiku via the `scan-score` Supabase function, accounts only, 6 pages/day per student and a monthly cap; the model writes SCN1 (`app/js/scnformat.js`), converted to MusicXML on the phone. Student compares photo and result and confirms. **Stays off (`SCAN_ENABLED`) until `tools/scan-eval.mjs` scores 95%+ on real photos.** Free self-hosted OMR (oemer) was tested and rejected: ~5 min/page and it crashed. |
| 2026-11 | **Free scan route** (default while the server scanner is off): Stave shows its SCN1 message to copy into an AI chat app the student may use; the copy says "an AI chat app you're allowed to use, such as ChatGPT or Gemini" (never Claude.ai: 18+). Student pastes the reply back; same compare-and-confirm screen. Under 13s are told to ask a parent, carer or teacher. Gemini API and Vertex AI were checked and rejected for the server scanner: both ban apps likely used by under 18s. |
| 2026-11 | **Clean dark design** (after Duolingo-style apps): solid near-black page (#131619), no photo, no glass blur, no gradients. Flat cards with a 2px edge. One flat **coral** accent (#ff6b4a buttons with dark text, #ff7a59 highlights). **Chunky buttons** with a darker bottom edge that sinks when pressed. Tab bar: the original **floating pill with the stretchy blob and rising bead** (restored by the owner), solid, no blur. Each tab owns a colour (Today coral, Read pink, Practise gold, Perform violet, Exam blue; Stats/Account green) used for the bead, the page-title underline, progress bars and the timer ring; a faint stave motif sits behind page titles. Tappable cards are chunky like the buttons. A Merit, Distinction or new best mark gets a confetti burst (`celebrate.js`, off in Still scenery). Day theme is the same, light. Plain words everywhere (no "drill", "clean run", "check"; speeds say "beats a minute"). |
| 2026-11 | **Examiner marking is the core** (`app/js/marking.js`): every play-through gets an *estimated* mark for the student's board: ABRSM /30 on Pitch, Time, Tone, Shape, Performance; Trinity /22 on Accuracy & fluency (7), Technical facility (7), Communication & interpretation (8) (repertoire-only /25). It replaces the /100 score everywhere shown (Perform result, Today, shelf, Stats, report card, teacher and parent views); the /100 score stays inside for streaks and tempo logic. Marked **slightly stricter than real**: Distinction needs every criterion at Merit or better; overall at most one band above the weakest; unheard criteria count as Pass level. With the mic, Tone and Shape are marked from loudness and flagged rough; a digital piano gives exact loudness, pedal and articulation. Always labelled an estimate. |
| 2026-11 | **Perform is played from memory and at the player's own speed.** The music is hidden until the result (then shown with every note coloured; a "Show the music" button is there if wanted; Learn slowly and bar practice still show it). No count-in, no metronome, no set speed or tempo lock in Perform: Stave listens from Start, beat 0 is the first real note, the speed is guessed from the player's own note gaps (`guessBeatMs`) and fitted bar by bar, and the take **never ends on its own**: it keeps listening through pauses and quiet bars until the player taps "I've finished" (20-minute safety cap). The screen is kept awake (Wake Lock) while listening or learning. While listening, Perform shows only a listening panel (mic ring, Hearing you / Still listening, timer, level bar) and the finish button. Speed is still *judged* against the marked tempo in the mark (examiners mark suitability of tempo). The main button is a big "Start listening"; "Hear the piece" plays it at the marked speed. The tempo slider, metronome and tempo lock remain for "Practise just some bars". |
| 2026-10 | Agent autonomy: fix bugs and small polish without asking; ask for anything with product or design choices. Ship in batches, push each. |

## Facts that took research

- ABRSM Performance Grade: 4 pieces × 30 + 30 for the performance as a whole = 150 (pass 100, merit 120, distinction 130). Sources are secondary; check ABRSM's own syllabus.
- Trinity digital repertoire-only pathway: 4 pieces, no technical work, total 100 (pass 60, merit 75, distinction 87). Per-piece bands out of 25 are scaled by us.
- Trinity's 7/7/8 split per piece is from Trinity's own blog ("From Pass to Distinction"); ABRSM's five criteria are from its syllabus marking criteria. Our weighting of measurements into each criterion is our own and untested against real examiner marks: compare with real exam results when students report them.
- The microphone checking is tuned on synthetic audio only. Real-piano accuracy is unproven until the owner records kits (Perform → Test lab → Recording kit) and they're run through `tools/evaluate-kit.mjs --tune`.

## Habits

- Run every `tests/*.test.mjs` (and `tests/db/run.sh` when SQL changes) before committing.
- Releases: add an entry at the top of `app/js/changelog.js` (plain words, for students), run `node tools/bump.mjs` (writes `app/js/version.js`, the service worker cache name and `CHANGELOG.md`), commit, then `sh tools/ship.sh --push`: it runs the checks, pushes, waits for the live site to serve the new version and compares file hashes. `tests/copy.test.mjs` fails if the version numbers disagree.
- Database: new numbered file in `supabase/migrations/`, safe to re-run; the owner runs it in Supabase **before** code that needs it is pushed; `supabase/audit.sql` after. `tests/db/run.sh` must run as a non-root user (in this container: copy to /tmp and `su postgres`).
- Accessibility: no overlay widgets, ever. Run axe (WCAG 2.2 AA) on every tab and page after UI changes; it was clean at 0.11.0.
- UI changes: `node tools/ui-audit.mjs` (needs the app served on :8765) and `tests/contrast.test.mjs` (checks every text colour on `--bg` and the card surfaces).
- Mark any temporary test code `TEMP-DEV`; the copy test refuses to ship it.
- GitHub project pages can't serve a domain-root robots.txt; use `noindex` meta tags instead.
- Never vendor outside code without asking (an earlier attempt was blocked); write it or ask.
