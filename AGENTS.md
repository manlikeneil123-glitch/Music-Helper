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
| 2026-10 | Name is **Stave**. Glass look on a dark piano-room photo; the owner likes it, so don't restyle it without asking. |
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
| 2026-10 | **Minimalist** screens. **Sunset** gradient glass (coral, magenta, purple) on both themes; Night still the default. |
| 2026-10 | Keep **5 tabs** (Today, Read, Practise, Perform, Exam), each simplified. **No on-screen piano on Perform** (microphone or MIDI keyboard only); Read keeps it for answering flashcards. |
| 2026-10 | **No preset songs.** Pieces come from importing MusicXML or a teacher's shared scores. A C major scale stays hidden, only for the warm-up check and the mic test kit. |
| 2026-10 | Tutorial: an optional guided tour (offered after setup, replayable from Settings, never auto-started) plus a self-ticking Getting started checklist on Today. |
| 2026-10 | Flashcards swipe away (right = got it, left = missed it). Calibration is a guided wizard in plain words. |
| 2026-10 | **Under 13s:** neutral birth month + year at sign-up (nothing pre-selected, remembered on the device so it can't be retried). Under 13 = account saves nothing until a parent approves by emailed link, or their studio teacher approves; unapproved accounts deleted after 14 days. |
| 2026-10 | Sign-up has an **unticked** "I agree to the Terms and Privacy Policy" box; the server stores the terms version and time. Links are blue and underlined. Deleting an account is a button in Account, never "email us". |
| 2026-10 | **Stats page** behind Today's three numbers (Today stays minimal). Tab bar: stretchy pill plus a rising bead in each tab's own Sunset colour. Glassy sign-in card that folds to the mark when switching forms. |
| 2026-10 | **Today's shelf** (after a perfume-shop reel): pieces in lit niches at the top of Today, plan and checklist below. Tap = zoom into the piece with Perform / Learn. Empty shelf = an add-a-piece niche; the warm-up scale stays hidden. |
| 2026-10 | **Photo scanning** (reverses the earlier G5 'not now'): Claude Haiku via the `scan-score` Supabase function, accounts only, 6 pages/day per student and a monthly cap; the model writes SCN1 (`app/js/scnformat.js`), converted to MusicXML on the phone. Student compares photo and result and confirms. **Stays off (`SCAN_ENABLED`) until `tools/scan-eval.mjs` scores 95%+ on real photos.** Free self-hosted OMR (oemer) was tested and rejected: ~5 min/page and it crashed. |
| 2026-10 | Agent autonomy: fix bugs and small polish without asking; ask for anything with product or design choices. Ship in batches, push each. |

## Facts that took research

- ABRSM Performance Grade: 4 pieces × 30 + 30 for the performance as a whole = 150 (pass 100, merit 120, distinction 130). Sources are secondary; check ABRSM's own syllabus.
- Trinity digital repertoire-only pathway: 4 pieces, no technical work, total 100 (pass 60, merit 75, distinction 87). Per-piece bands out of 25 are scaled by us.
- The microphone checking is tuned on synthetic audio only. Real-piano accuracy is unproven until the owner records kits (Perform → Test lab → Recording kit) and they're run through `tools/evaluate-kit.mjs --tune`.

## Habits

- Run every `tests/*.test.mjs` (and `tests/db/run.sh` when SQL changes) before committing.
- Releases: add an entry at the top of `app/js/changelog.js` (plain words, for students), run `node tools/bump.mjs` (writes `app/js/version.js`, the service worker cache name and `CHANGELOG.md`), commit, then `sh tools/ship.sh --push`: it runs the checks, pushes, waits for the live site to serve the new version and compares file hashes. `tests/copy.test.mjs` fails if the version numbers disagree.
- Database: new numbered file in `supabase/migrations/`, safe to re-run; the owner runs it in Supabase **before** code that needs it is pushed; `supabase/audit.sql` after. `tests/db/run.sh` must run as a non-root user (in this container: copy to /tmp and `su postgres`).
- Accessibility: no overlay widgets, ever. Run axe (WCAG 2.2 AA) on every tab and page after UI changes; it was clean at 0.11.0.
- UI changes: `node tools/ui-audit.mjs` (needs the app served on :8765) and `tests/contrast.test.mjs`. If the background photo, `--photo-filter` or `--shade` change, re-measure the backdrop colours in the contrast test.
- Mark any temporary test code `TEMP-DEV`; the copy test refuses to ship it.
- GitHub project pages can't serve a domain-root robots.txt; use `noindex` meta tags instead.
- Never vendor outside code without asking (an earlier attempt was blocked); write it or ask.
