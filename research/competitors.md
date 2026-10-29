# Music Helper: competitor analysis (October 2026)

I read README.md and PLAN.md and skimmed `app/js` without changing anything. Music Helper already has flashcards (notes, keys, intervals, chords) with Leitner spaced repetition, a timer with goal and streak, a daily plan v0, and Perform with mic, MIDI or on-screen input. Perform includes Learn mode, bar drills to 3 clean runs, tempo lock, hands separate, Gentle/Standard/Exam strictness, MusicXML/.mxl import, rubato-aware timing, MIDI dynamics and pedal checks, and per-user mic tuning. Ideas below that duplicate any of this have been dropped.

**Caveat on the data.** Prices come from mixed sources (App Store, reviews, resellers) and differ by region. "n/f" means not found. I could not get at Reddit threads directly, so the complaint themes come from Trustpilot, App Store listings and teacher blogs.

## 1. Comparison table

| App | Target | Input | Price (approx.) | Rating | Main weakness for a UK teen sitting ABRSM/Trinity with a teacher |
|---|---|---|---|---|---|
| **Simply Piano** | Adult and teen self-learners | Mic, MIDI | £84–105/yr UK, monthly about £18 | 4.7★ (178k, UK App Store); Trustpilot 3.0 | Pop and gamified path, no exam content, no teacher link. Complaints about charges straight after a trial and hard cancellation. Teachers say it can't see technique or catch wrong fingering. [1][2][3] |
| **Flowkey** | Self-learners, songs | Mic, MIDI | about $120/yr | Trustpilot 4.0 (420) | Now has **20+ official ABRSM pieces (Grades 1–8)** with listening and hands separate. But no metronome, songs get removed, no teacher dashboard (teachers get only referral codes and the library). [4][5][6][7] |
| **Skoove** | Adult beginners | Mic, MIDI | about $150/yr, $29.99/mo | 4.6★ App Store, 4.4 Play | Mic registers notes that weren't played. Complaints about trials and refunds. No exam path. [4][8] |
| **Yousician** | Multi-instrument hobbyists | Mic (polyphonic) | $120–180/yr | 4.7★ (21.9k); Trustpilot 3.9 | Piano isn't its main instrument. Pitch detection mishears correct playing, progress plateaus after beginner level, complaints about auto-renewal. [9][10] |
| **Playground Sessions** | Beginners who like pop | MIDI only in practice | $150/yr, $349 lifetime | Play 3.7 | Doesn't work with acoustic pianos. No exam content. [4][11] |
| **Piano Marvel** | Teachers, schools, serious learners | MIDI first, mic added (claims 90% accuracy on 3-note chords) | $110–130/yr | n/f | **Closest overall incumbent:** SASR sight-reading test, teacher assignments and reports. But US-centric, dated UI, MIDI first, no ABRSM/Trinity structure. [4][12][13] |
| **Pianote** | Adults, video lessons | None (no real-time feedback) | $200–240/yr | n/f | Video feedback takes days, no checking. [14] |
| **Tonestro** | Mostly wind and strings | Mic | £149.99/yr | Educational App Store 4.0 | Expensive, not piano-first, no teacher loop. [15] |
| **Trala** (violin) | Violin self-learners | Mic (pitch) | about $120/yr, optional live teachers | n/f | Shows the hybrid model (app plus paid human teachers). Not piano. [16] |
| **Tomplay** | Classical players wanting accompaniment | Playback only | Subscription (not verified) | n/f | ABRSM partnership covers mainly strings/wind; piano content unclear. Play-along only, nothing assessed. [17] |
| **MuseScore / Ultimate Guitar** | Score consumers | None | PRO about $60–70/yr | Trustpilot is full of billing complaints | Score library only, no checking. Upsell pressure and surprise PRO+ charges. [18] |
| **Newzik / forScore** | Performers, ensembles (iPad) | None | forScore $24.99 + Pro; Newzik €50/yr | forScore 4.7–4.8★ | Readers and annotators, not coaches. [19][20] |
| **Read Ahead (Informance)** | Sight-reading | None (bars disappear) | Free app + $14.99 books | n/f | No assessment. Loosely graded to ABRSM levels. [21] |
| **Sight Reading Factory** | Schools (US) | Some mic | about $35/yr; students from $2 | **2.7★** (313) | Poor app. Tempo complaints. Not UK-graded. [22] |
| **ABRSM Piano Practice Partner** | ABRSM candidates | Playback only | Free + £1.99 per piece, £8.99 per grade | **2.4★** (89, UK) | Broken loop and transport controls, download failures. Plays the other hand, checks nothing. [23][24] |
| **ABRSM Piano Scales Trainer** | ABRSM candidates | Records you, **self-rated** | £4.99 | 3.6★ (14) | Doesn't listen. Updates removed old-syllabus content. [25] |
| **ABRSM Sight-Reading / Aural Trainer** | ABRSM candidates | Quizzes; Aural marks some answers | £4.99 / £7.99 (Aural is iOS only) | n/f | Sight-reading trainer doesn't assess your playing ("no clever technology to assess" it, per Music Teacher magazine). [24][26] |
| **Trinity NoteLab Music** | Trinity teachers and students, Initial–Grade 5 | Audio upload, teacher annotates | **Free** | No reviews | AI is used only for repertoire search. No automatic checking. Web only, piano only. [27][28] |
| **SightReader (Bret Cameron)** | Sight-reading, ABRSM-aligned Initial–Grade 8 | **Mic, MIDI** | Free, Pro $5.99/mo or $57.99/yr | 4.2★ (5) | **Most direct small rival:** solo developer, mic plus MIDI, timing scoring, **free teacher dashboard**. Very new, sight-reading only, no Trinity. [29] |
| **Playnote SCALEBOOK / AURALBOOK** | ABRSM scales and aural | Mic, AI marking | about $7/mo | 3.7★ (7) / about 4.4★ | AI mock exams and teacher visibility, but **SCALEBOOK has no piano**. [30][31] |
| **Tonara** | Teacher–student practice tracking | — | — | — | **Shut down 8 December 2023.** Teachers moved to PracticeSpace and others. [32][33] |
| **PracticeSpace / Better Practice / Vivid / MetaPractice** | Teacher studios | Timer and uploads only | PracticeSpace flat monthly fee; Better Practice per student, about $16/mo | Mixed | They log minutes, not playing. PracticeSpace rewards points and minutes (a student review asks for timer fixes). Better Practice is web only and overwhelming; its spaced-repetition assignment lists are a good idea. [34][35] |
| **Note Rush** | Kids' note reading, teachers | Mic | £8.99 one-off | Teachers love it | Note reading only. Its QR/link level sharing is a model worth copying. [36] |
| **Piano Maestro** | Young children, teachers | Mic, MIDI | Free for teachers | n/f | Childish for teens. Gamified. [37] |
| **Synthesia** | Hobbyists | MIDI | Free + unlock | 3.9★ | Falling notes train note-matching, not reading. [38] |
| **Pianu** | Browser learners | Web MIDI | Freemium | n/f | Chrome only, no iPad MIDI. [39] |
| **Musiclock** | Scales and improvisation backing | None | about £10–15, iPad | n/f | Backing tracks only; useful for Trinity improvisation. [40] |
| **My Music Staff / Opus1** | Studio admin (billing, scheduling) | — | $16.95/mo / $98+/mo | — | Admin only, not practice. These are integration partners, not rivals. [41] |
| **E-MusicMaestro (UK)** | ABRSM/Trinity aural and sight-reading | Listen and self-check | from £2.89/mo | n/f | Web drills, no playing assessment. Trinity recommends it. [42] |
| **Charanga / Yumu (UK)** | School music hubs | — | Hub licence | — | Reaches 2.5M UK pupils but isn't piano practice. A possible channel. [43] |

## 2. Gaps nobody fills well

1. **Nobody checks the whole exam.** Pieces (Flowkey has some ABRSM pieces), scales (ABRSM's app is self-rated; SCALEBOOK has no piano), sight-reading (SightReader, unassessed ABRSM trainer) and aural (AURALBOOK) sit in **5+ separate apps**, mostly rated 2.4–3.7★. No one combines them into one readiness picture for an exam date.
2. **Teacher tools are either "logs minutes" or "listens to uploads".** PracticeSpace and Better Practice track time. NoteLab makes the teacher listen to raw audio. Piano Marvel is the only one with auto-scored data plus a teacher link, and it is US-centric and MIDI first. Nobody gives a UK teacher a 30-second "which bars broke and why" summary before the lesson.
3. **The space Tonara left is still open**, and teachers dislike switching platforms.
4. **Trinity is badly served.** Only NoteLab (Grade 5 cap, no checking) and E-MusicMaestro cover it. Trinity's supporting tests (improvisation, musical knowledge) and technical work have no app support at all.
5. **Grade 5 theory** (ABRSM's requirement for Grade 6–8 practical) has only the dated Theory Works app.
6. **Mic on iPhone with a family upright** is the real UK teen setup. Incumbents treat the mic as second-rate and push MIDI. Your verification approach and "unclear ≠ wrong" rule is a real advantage, if it holds up on real pianos.
7. **Trust and billing.** Every big app's Trustpilot page is dominated by surprise charges and cancellation complaints. "Free, no account, no trial trap" is a selling point in itself.
8. **The skills examiners actually reward are not measured:** continuity (keeping going), steady pulse without a metronome, character and dynamics. Apps with a "Wait mode" train students to *stop* on errors.

## 3. Feature ideas

Effort assumes a solo developer building a vanilla-JS PWA. Ideas marked ⚠ are copycat or traps.

| # | Idea | Weakness it exploits | Effort | Impact |
|---|---|---|---|---|
| 1 | **Exam countdown planner.** Enter board, grade and exam date; it plans backwards: weekly targets for each piece, scales rotation, sight-reading and aural. | Nobody plans to a date | S | High |
| 2 | **Mic scales checker** shaped to the syllabus: per-grade lists (requirements are facts, not copyright), checking notes, evenness, legato gaps, and minimum tempo. | ABRSM trainer is self-rated; SCALEBOOK has no piano | M | High |
| 3 | **"Examiner asks" mode.** Random scale called aloud; measures how long the student hesitates before starting, plus accuracy. | Nobody tests recall under pressure | S | High |
| 4 | **Continuity score.** Count stops, restarts and hesitations in Perform; examiners reward keeping going. | Wait modes train stopping | S | High |
| 5 | **Steady-pulse score with no metronome**, reusing your tempo-fit and drift analysis. | Apps check against a click; exams have none | S | High |
| 6 | **Sight-reading drill:** procedurally generated grade-parameter excerpts (key, metre, range, rhythms) with a 30-second prep timer, then a one-shot scored run. ⚠ SightReader is close; you win only by tying it to the countdown and teacher view. | ABRSM trainer doesn't assess | M–L | High |
| 7 | **Read-ahead mode:** bars hide as the cursor passes. | Read Ahead isn't assessed | S | Med |
| 8 | **Mock exam:** pieces, scales, sight-reading, then results by component, with a clearly labelled "rough readiness" (not a predicted mark). | No combined view | M | High |
| 9 | **Teacher assignment link/QR with no accounts.** URL encodes piece, bars, target tempo, strictness and due date. | Accounts slow adoption; Note Rush shows QR sharing works | S | High |
| 10 | **Weekly report card:** image or PDF the student sends over WhatsApp. Shows the bars that failed, the tempo ladder and clean runs, not minutes. | Tonara gap; PracticeSpace logs only time | S | High |
| 11 | **Teacher dashboard** with auto-checked data (worst bars, error type, trend). ⚠ Piano Marvel, SightReader, PracticeSpace and NoteLab all have dashboards; win on *depth of checked data*, not existence. | Minute-logging apps | L | High |
| 12 | **Problem-bar heatmap** across the week on the score. | Nobody shows it | S (after #10) | High |
| 13 | **Spaced review of bars:** pieces and bars mastered last week come back for a quick check. | Better Practice does assignments, not bars | S | Med–High |
| 14 | **"Lesson-end 3 targets":** teacher types on the student's phone in the lesson; these drive the daily plan. | Lesson notes live in paper notebooks | S | High |
| 15 | **Plan aware of lesson day:** intensity rises before the lesson, with a "what to show your teacher" prompt. | Generic streaks | S | Med |
| 16 | **Practice-quality metric** (clean runs, bars fixed) replaces minutes for streaks. | Timer gaming; Children's Code care | S | Med–High |
| 17 | **Grade 5 theory decks:** terms, time signatures, transposition, cadences, ornaments, Italian terms, using the existing Leitner engine. | Only the dated Theory Works app | M | High |
| 18 | **Musical knowledge questions** about the student's own imported piece (key, terms, structure), auto-generated from MusicXML. Suits Trinity musical knowledge and ABRSM viva-style questions. | Nobody does it | M | Med |
| 19 | **Trinity improvisation prompts** (stylistic, motivic, harmonic) with a simple backing loop. ⚠ Musiclock does backing better. | Trinity supporting tests ignored | M | Med |
| 20 | **Aural: clap-back pulse and sing-back echoes** via mic pitch detection. ⚠ AURALBOOK and ABRSM Aural do this; do it only inside the mock exam. | ABRSM Aural is iOS only, £7.99 | M | Med |
| 21 | **Mic dynamics contour:** relative loudness versus the score's p/f/hairpins (you already disable AGC). | Dynamics checking is MIDI only everywhere | M | Med–High |
| 22 | **Performance Grade recorder:** camera framing guide, one unedited take, ID reminder for Grades 6–8, and a self-check of the result. | ABRSM/Trinity digital grades have no practice tool | M | Med |
| 23 | **"Exam room" simulation:** one take, no restarts, timer, nerves warm-up. | Nobody rehearses the pressure | S | Med |
| 24 | **Teacher MusicXML pack sharing:** teacher-made files (their own arrangements) sent by link, so you never host copyrighted scores. | Flowkey's song removals; Practice Partner £8.99/grade | S | Med |
| 25 | **Syllabus tracker:** list piece titles per grade (titles are facts) with "my choice" and readiness per component. | No one shows the whole exam | S | High |
| 26 | **Sampled piano sound** instead of the synth. ⚠ Polish, not a differentiator. | — | S–M | Med |
| 27 | **"Ghost hand" playback** for hands-separate practice. ⚠ Practice Partner does it with real recordings, badly (2.4★). | Its bugs | M | Low–Med |
| 28 | **Honest billing:** free tier with no auto-renew trap, cancel in one tap, no account needed. | Trustpilot complaints across the board | S | High (trust) |
| 29 | **Children's Code-first privacy page** for parents and teachers: on-device by default, no ads. | Big apps advertise to kids | S | Med |
| 30 | **Parent digest link** (parents pay for teens). | Parents are blind | S | Med |
| 31 | **Bluetooth MIDI latency calibration** (already in the plan). | Common sync complaints | S | Low–Med |
| 32 | **Fingering from MusicXML** shown, plus teacher-editable fingering. | Apps can't verify fingering; at least show the teacher's | S | Med |
| 33 | **Class leaderboard on clean runs**, opt-in and per studio. ⚠ PracticeSpace already gamifies; keep it minor. | Minute-based leaderboards | M | Low–Med |
| 34 | **Music hub / school licence** (Charanga-style channel). Business, not code. | Hubs reach millions of UK pupils | — | High (later) |
| 35 | ⚠ **Photo → score (OMR).** Trap: high error rate breaks trust; keep it at V2 or later, as PLAN.md says. | — | L | Med |
| 36 | ⚠ **Pop song library.** Trap: needs licensing, and Simply Piano and Flowkey will always win it. | — | L | Low for this segment |
| 37 | ⚠ **XP and badges.** Simply Piano does this better; it doesn't suit a teacher-first positioning. | — | S | Low |
| 38 | ⚠ **AI chat tutor.** Only worth it as an explainer over your structured analysis; otherwise it's a gimmick. | — | M–L | Low–Med |

**Bottom line.** Your defensible wedge is not "another app that listens"; Flowkey now has ABRSM pieces and Piano Marvel has mic plus a teacher link. The wedge is **the only app that covers the whole UK exam (pieces, scales, sight-reading, continuity and pulse) and gives the teacher checked data**, for free, on an iPhone mic.

**Watch these:**
- **SightReader:** same founder profile as you, already has mic, MIDI and a free teacher dashboard.
- **Flowkey's ABRSM deal:** if it adds a teacher view, the gap narrows fast.
- **Trinity NoteLab:** if it adds automatic checking, it is free and official.

**Build first:** ideas 1, 4, 5, 9, 10, 2 and 25. All are S–M, need no backend and play to your analysis engine.

## Sources
[1] https://apps.apple.com/gb/app/simply-piano-learn-piano-fast/id1019442026 · [2] https://uk.trustpilot.com/review/hellosimply.com · [3] https://chiarunpiano.co.uk/blog/2019/response-from-developers-of-simply-piano · [4] https://hackernoon.com/lang/so/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology · [5] https://uk.trustpilot.com/review/flowkey.com · [6] https://www.flowkey.com/en/abrsm-collaboration · [7] https://www.flowkey.com/en/teachers · [8] https://grand-screen.com/apps/skoove-learn-piano/reviews/ · [9] https://uk.trustpilot.com/review/yousician.com · [10] https://unstar.app/blog/yousician-simply-piano-flowkey-fender-play-music-learning-apps-ranked-2026 · [11] https://www.musicradar.com/reviews/playground-sessions-review · [12] https://pianomarvel.com/en/feature/microphone-assessment · [13] https://support.pianomarvel.com/portal/en/kb/articles/can-i-link-my-students-to-my-teacher-account · [14] https://pianoers.com/pianote-review/ · [15] https://apps.apple.com/us/app/tonestro-music-lessons/id1365630760 · [16] https://preply.com/en/blog/best-violin-learning-apps/ · [17] https://tomplay.com/abrsm · [18] https://www.trustpilot.com/review/musescore.com · [19] https://apppricinglab.com/iap/apple/363738376 · [20] https://apps.apple.com/DE/app/id966963109 · [21] https://www.informance.biz/online-academy/page/137-introduction · [22] https://justuseapp.com/en/app/1046058520/sight-reading-factory/reviews · [23] https://apps.apple.com/gb/app/abrsm-piano-practice-partner/id891238739 · [24] https://www.pianistmagazine.com/blogs/abrsms-digital-support-for-pianists · [25] https://apps.apple.com/gb/app/abrsm-piano-scales-trainer/id1511139245 · [26] https://www.musicteachermagazine.co.uk/articles/app-reviews-abrsm-strings-apps · [27] https://trinitycollege.com/news/viewarticle/trinity-launches-notelab-music · [28] https://trinitycollege.com/notelab-music · [29] https://apps.apple.com/us/app/sightreader/id6777734489 · [30] https://apps.apple.com/app/id992815296 · [31] https://apps.apple.com/app/id554032995 · [32] https://en.wikipedia.org/wiki/Tonara_(company) · [33] https://pianopantry.com/podcast/episode132/ · [34] https://colourfulkeys.ie/piano-practice-apps/ · [35] https://apps.apple.com/app/id1451645821 · [36] https://colorinmypiano.com/2016/06/21/review-giveaway-note-rush-app/ · [37] https://www.commonsensemedia.org/app-reviews/piano-maestro-by-joytunes · [38] https://apppricinglab.com/app/apple/579518445 · [39] https://pianu.com/faq · [40] https://apps.apple.com/app/id961947711 · [41] https://opus1.io/my-music-staff-comparison/ · [42] https://www.e-musicmaestro.com/auraltests · [43] https://charanga.com/site/music-hubs/yumu/
