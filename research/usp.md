# Music Helper USP report

No files were changed. I read README.md, PLAN.md and the app code in `/home/user/Music-Helper/app/js/`.

## 1. What the app actually does today

| What | Where | Status |
|---|---|---|
| Score-informed checking: aligns the notes played against the score, fits the student's own tempo, judges early/late/cut-short notes and rushing/dragging, finds the worst bar and gives one prioritised next step | `analysis.js` | Real and good. It is the strongest asset. |
| Mic checking on an acoustic piano, chords included: onsets, harmonic evidence, "unclear" instead of guessing, catches octave errors, calibration | `micanalysis.js` | Tested on synthetic audio only. The upper note of an octave is caught only 0–2 times in 10. |
| Per-device "the app got it wrong" learning | `tuning.js` | Unusual feature. It builds trust. |
| Learn and Perform modes, drill the worst bar until 3 clean runs, tempo lock, hands separately, Gentle/Standard/Exam strictness | `check.js` | Built |
| Dynamics, voicing, pedal and articulation checks | `analysis.js` (`checkMusicality`) | **MIDI only.** iPhone Safari has no Web MIDI, so the main audience never gets these. |
| MusicXML import (6 files max) | `musicxml.js` | Built |
| Library: C scale, Ode to Joy, chords, Bach Prelude bars 1–4 | `pieces.js` | Tiny |
| Flashcards in four decks, practice timer, streaks, lesson plan v0 | `flashcards.js`, `timer.js`, `app.js` | The plan always starts with the C major scale, whatever the student is learning. |
| Exam board choice at setup | `welcome.js` | **Stored but only shown as a label.** Nothing in the app uses it. |
| Accounts, teacher view, parent view | none | Not built. Everything stays on the device. |

## 2. How the competitors position themselves

- **Simply Piano:** gamified quick wins with songs, 50M+ installs, about $119–150 a year.
- **Flowkey:** favourite songs, polished and not gamified, $119.88 a year.
- **Skoove:** structured course and music reading.
- **Yousician:** many instruments, piano is secondary.
- **Piano Marvel:** a sight-reading level test (SASR) with 90 levels, aimed at US studios.
- **Tonara:** teacher studio. It tracks practice *minutes* and assignments, has points, leaderboards and parent minute-checking, and now advertises AI feedback.
- **ABRSM Scales Trainer (£4.99):** a *record and judge yourself* tool with a practice meter. It does not mark your playing.
- **ABRSM Aural Trainer:** auto-marked aural tests. Practice Partner gives accompaniments.
- **SCALEBOOK and AURALBOOK (Playnote):** "AI examiner" mock exams for scales and aural. These are the closest threat to an exam angle.
- **Sight Reading Factory:** generates sight-reading tests.

**The gap:** nobody listens to a UK grade student's *own exam pieces* on an *acoustic piano* and says which bars will cost marks. Nobody gives a teacher bar-level evidence instead of minutes.

## 3. Can the app mark playing the way an examiner would?

**ABRSM Practical Grades** are marked out of 150:
- 3 pieces at 30 marks each, scales and arpeggios 21, sight-reading 21, aural 18.
- Pass is 100, Merit 120, Distinction 130. You don't need to pass every section.
- Each piece is marked on **pitch, time, tone, shape and performance**. The bands are Distinction 27–30, Merit 24–26, Pass 20–23 and Below Pass 17–19.
- Examiners "mark up or down from the pass mark… balancing" the criteria. That is **holistic judgement with no formula.**

**Trinity** is marked out of 100: three pieces at 22 marks each, technical work 14, and two supporting tests at 10 each. Pass is 60, Merit 75, Distinction 87. Each piece is split into fluency and accuracy (7), technical facility (7), and communication and interpretation (8).

What the code can measure for each ABRSM criterion:

| Criterion | Over the mic today | Verdict |
|---|---|---|
| **Pitch** (accurate notes) | Yes: wrong, missed and extra notes per bar | Strong |
| **Time** (tempo, pulse, rhythm, fluency) | Yes: tempo fit, steadiness, drift, rushing, stops | Strong |
| **Recovery from slips** (part of Performance) | Partly: `stoppedAtBar` and gaps could be checked | Buildable |
| **Tone** (evenness, projection) | No. Loudness from the mic is relative and depends on the room. | Weak at best |
| **Shape** (dynamics, phrasing) | MIDI only. On the mic it would need loudness curves that hold up across rooms. | Hard |
| **Performance** (character, conviction) | No | Not credible |

**Verdict:** "Gives you the ABRSM mark" is **not feasible or honest.** It would also invite a trademark or misrepresentation complaint, and it fails the first time a teacher disagrees. What *is* defensible is a **Pitch & Time readiness band** for each piece ("Pitch: Merit-level · Time: Pass-level · bar 12 is costing you"). Label it as following the published criteria, never as official. **Scales** are the best fit by far: one note at a time, a known pattern, published requirements, and 21 marks. The mic can get close to examiner-grade on accuracy and evenness of pulse there.

## 4. Candidate USPs

Columns: the positioning in one line · who it's for · the moat · what the code backs up today · what to build · the brutal risk.

1. **"Know which bars will cost you marks."** Grade 1–5 teens with an exam date. *Moat:* a teacher-founder plus score-aware diagnosis; the incumbents don't do UK exams. *Today:* worst bar, Exam strictness, drills. *Build:* readiness bands per board, an exam countdown, a per-piece readiness report. *Risk:* medium. Exam fees create urgency and parents pay, but getting the student's own pieces into the app is the bottleneck (see §6).
2. **"The ABRSM scales test, marked by your phone."** Every grade student. *Moat:* ABRSM's own trainer doesn't mark you, and SCALEBOOK isn't piano-mic-first. *Today:* scale checking works, but there is only one scale. *Build:* scale lists for each grade and board, a random examiner-style call ("D major, hands together, 2 octaves, legato"), speed targets. *Risk:* low on tech. Playnote could copy it. It's narrow, but it's an excellent hook.
3. **"Your teacher sees which bars got fixed, not just minutes."** Teacher plus student. *Moat:* Tonara sells minutes and points; this sells evidence. *Today:* run history per bar (local only). *Build:* accounts, sync, a teacher view (L). *Risk:* the best long-term moat and distribution channel, and the hardest build. Teachers pay little (£10–15 a month).
4. **"Practise like a teacher is listening, not playing a game."** Serious teens who are bored of Simply Piano. *Moat:* positioning. *Today:* specific next-step feedback. *Build:* almost nothing. *Risk:* this is a tone, not a moat. Flowkey already says "not gamified".
5. **"Your exam pieces, your book, checked."** *Moat:* the incumbents sell licensed song libraries. *Today:* MusicXML import. *Build:* a teacher import workflow, photo scan (OMR) with a confirm step. *Risk:* **high.** Teens don't own MusicXML files of copyrighted exam pieces.
6. **"Works on the real piano in your living room."** Owners of acoustic uprights. *Moat:* score-informed chord checking is hard to build. *Today:* tested on synthetic audio only. *Build:* the real-piano test set. *Risk:* it's a requirement, not a reason to choose. Simply Piano also uses the mic.
7. **"Never practise a mistake in."** *Today:* tempo lock plus 3 clean runs. *Risk:* easy to copy, but true, and teachers love it.
7a. **"Honest when unsure."** It says "unclear" instead of a false wrong note, and lets the student correct it. *Risk:* a trust feature, not a headline.
8. **"Performance Grade dress rehearsal."** Record all four pieces as one run and get a Pitch & Time check before uploading to ABRSM. *Moat:* niche. *Build:* full-programme mode, a video framing guide (M). *Risk:* a real use case and timely, but small.
9. **"Sight-reading at your grade, marked."** *Build:* a generator for each grade, timed preparation (M–L). *Risk:* Sight Reading Factory and Piano Marvel already own this.
10. **"Aural tests sorted."** *Risk:* ABRSM's Aural Trainer and AURALBOOK already do it. Skip.
11. **"Parents see progress, not nagging."** A weekly email to a parent. *Build:* accounts and email (M). *Risk:* parents are the buyers, so it boosts conversion. It needs no-guilt copy to stay inside the UK Children's Code.
12. **"No ads, no public leaderboards, no data sold: built for under-18s under the UK Children's Code."** *Risk:* expected, not chosen. It becomes a selling point only to schools.
13. **"Cheaper than one lesson a month."** About £4–6 a month. *Risk:* price is not a moat.
14. **"Made by a working piano teacher."** *Risk:* credible and founder-led, but anyone can say it.
15. **"Between-lesson coach, never a replacement."** *Risk:* this is the PLAN's line. It's good for teachers but too soft to sell to teens.
16. **"Grade-by-grade practice path from Initial to Grade 5."** *Build:* a curriculum (L, content work). *Risk:* slow content work, and it can't use copyrighted exam pieces.
17. **"Mock exam day."** Pieces, scales and sight-reading in examiner order with a mark-band summary. *Risk:* compelling, but it inherits the feasibility limits from §3.

## 5. Top 5

1. **#1, exam readiness by bar.** It's the only angle that uses the board choice, the Exam strictness and the analyser together, and it hits a dated, paid pain point.
2. **#2, mic-marked scales.** Fastest to ship, free of copyright, and closest to examiner-grade.
3. **#3, teacher sees fixed bars.** The moat and the distribution channel, but later.
4. **#7, never practise a mistake in.** The proof point inside #1.
5. **#11, parent visibility.** The money lever.

## 6. Recommendation

**Primary USP: the exam-readiness coach that listens to your real piano and tells you which bars and scales will cost marks.** #2 and #7 are its proof points, and #3 comes later as the moat.

- **Tagline:** *"Know which bars will cost you marks."*
- **App Store subtitle:** "Fix the bars that cost marks" (27 characters). A safer alternative is "Graded exam piano coach" (23).
- **Store description:**
  - Play your exam pieces and scales on your own piano. Your phone's mic checks every note and beat, then shows the exact bars to fix.
  - See a Pitch and Time readiness band against the published ABRSM and Trinity grade criteria, with a countdown to your exam day. (It is not an official mark.)
  - Drill the weak bar at a locked tempo until it's clean three times, so you never practise a mistake in. No ads, no public profiles.

**The killer risk:** getting copyrighted exam pieces into the app. A teenager can't make MusicXML. In order of preference:
- (a) the teacher imports pieces once and shares them with their own students only;
- (b) OMR of the student's own book, with a confirm step;
- (c) launch on scales plus public-domain pieces that appear on the syllabus.

Test (a) with your own students first.

## 7. Features that directly reinforce the USP

| Feature | Effort | Impact |
|---|---|---|
| Real-piano mic test set (~30 clips) and re-tuned thresholds. Without this nothing above is true. | M | Critical |
| Scale requirements for each grade and board, random examiner calls, speed targets, mic marking | M | Very high |
| Exam date, countdown and a readiness view for each piece (Pitch and Time bands mapped to 20/24/27 out of 30) | M | Very high |
| Use the stored board and grade to drive the lesson plan (it is currently ignored) | S | High |
| "Bars costing marks" heat-strip on the score across runs | S | High |
| Recovery-from-slips detection (stops and restarts) | S | Medium |
| Mock exam mode: pieces, then scales, then sight-reading, with a summary | M | High |
| Shareable readiness report (PDF or link) for the teacher or parent, no account needed | S–M | High |
| Teacher import-and-share of pieces | L | Critical for pieces |
| Performance Grade full-run mode | M | Medium |
| Teacher dashboard with accounts | L | High, later |
| Mic loudness-contrast check ("I heard no difference between p and f"), cautious wording | M | Medium |

## 8. Features that dilute the USP

- **Practice timer as a main tab.** Minutes are Tonara's metric, not ours. Fold it into the session log quietly.
- **Streaks, the minutes chart and the goal ring at the top of Today.** They push the gamified, minutes-first framing. Lead with "exam in 23 days · 3 bars to fix".
- **Key-signature, interval and chord flashcards as a peer of Perform.** Keep the notes deck and move the rest under "Theory warm-up".
- **On-screen and computer-key checking (A–K, Space for pedal).** It makes the headline feel like a toy. Keep it for Learn mode and demos, and hide it from Perform.
- **The Test lab and the per-verdict correction UI shown to every user.** Put them behind a "the mic got it wrong?" link.
- **MIDI-only musicality claims (dynamics, voicing, pedal).** The iPhone audience never sees them. Don't market them.
- **Heavy animated glass and photo background.** It costs CPU on the phones that do mic analysis and adds nothing to the message. Use a still frame.
- **The generic "Read. Practise. Perform." welcome tagline.** Replace it with the exam promise.

## Sources

- [ABRSM Piano Practical Grades syllabus 2025–26 (marks, criteria, bands)](https://www.abrsm.org/sites/default/files/2024-06/Piano%202025%20%26%202026%20Prac%20syllabus%2020240524_access.pdf)
- [ABRSM results guide](https://www.piano-composer-teacher-london.co.uk/abrsm-exam-results/)
- [Trinity: From Pass to Distinction](https://blog.trinitycollege.co.uk/from-pass-to-distinction)
- [Trinity assessment](https://trinitycollege.com/qualifications/music/grade-exams/about/assessment-and-recognition)
- [Making Music on ABRSM Performance Grades](https://www.makingmusic.org.uk/node/35783)
- [HackerNoon piano apps 2026](https://hackernoon.com/lite/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology)
- [Pianist: ABRSM digital support](https://www.pianistmagazine.com/blogs/abrsms-digital-support-for-pianists)
- [ABRSM Scales Trainer (appfollow)](https://appfollow.io/android/abrsm-piano-scales-trainer/com.scalestrainer?country=gb)
- [ABRSM Aural Trainer](https://apps.apple.com/us/app/-/id491907493)
- [SCALEBOOK](https://apps.apple.com/app/id992815296)
- [AURALBOOK](https://apps.apple.com/app/id554032995)
- [Tonara (TopMusic)](https://topmusic.co/6-ways-to-save-time-with-tonara-in-your-piano-studio/)
- [Tonara profile](https://www.startuphub.ai/startups/tonara.md)
- [Piano Marvel SASR](https://pianomarvel.com/article/the-ultimate-sight-reading-test)

I didn't check whether ABRSM Performance Grade recordings must be a single unedited take. Check ABRSM's own guidance before building feature #8.