# Music Helper: can it take a student from Grade 1 to Grade 8? Gap audit

I read README.md, PLAN.md and every module in `app/js/`. I changed no files. Repo: `/home/user/Music-Helper`.

## 1. What the exams require

**ABRSM Piano Practical Grades, 2025–2026 spec** (valid 1 Jan 2025 – 31 Dec 2026; a 2027–28 piece list is already on sale)
- **Marks, out of 150:**
  - three pieces, one from each of Lists A, B and C, 30 marks each (60%)
  - scales and arpeggios, 21 (14%)
  - sight-reading, 21 (14%)
  - aural tests, 18 (12%)
- **Result bands:** Pass 100, Merit 120, Distinction 130. You don't need to pass every section.
- **Pieces** are marked on pitch, time, tone, shape and performance. Examiners judge pedalling by its effect, not by whether it matches the printed marks. D.C. and D.S. must be followed.
- **Scales and arpeggios** are played from memory, in even notes, legato unless staccato is specified, with no pedal.
  - Grade 1 example: C major hands together over 1 octave; G and F major and A and D minor hands separately over 2 octaves; C major contrary motion; G major and A minor arpeggios.
  - Grade 8 example: 4-octave scales; scales a sixth apart; contrary motion; legato scales in 3rds and staccato scales in 6ths; a chromatic scale a major sixth apart; whole-tone scales; second-inversion arpeggios; dominant and diminished 7ths.
  - Guide speeds run from crotchet = 60 at Grade 1 to minim = 88 at Grade 8.
  - Each syllabus uses only a subset of keys for each grade.
- **Sight-reading** gets 30 seconds of preparation. The parameters build up grade by grade:
  - Initial: 4 bars in 4/4, C major and D minor, five-finger position.
  - Grade 8: about a page, 12/8, five-flat and five-sharp keys, ornaments, spread chords, una corda.
  - In between come 6/8 (Grade 4), syncopation (Grade 5), 5/8, 5/4, triplets and clef changes (Grade 6), and 7/8 and tempo changes (Grade 7).
- **Aural tests** get one overall mark.
  - Grades 1–3: clap the pulse and say whether it's in 2 or 3 time; sing back echoes; spot where a pitch changed; describe dynamics and articulation.
  - Grades 4–5: sing back or play back a melody from memory; sight-sing 5–6 notes; describe features including character and style/period; clap back a rhythm.
  - Grades 6–8: sing back the upper, lower or lowest part of two- and three-part phrases; sing a part from score with the examiner accompanying; name cadences (perfect, imperfect, interrupted, plagal); name chords I/ii/IV/V/V7/vi with inversions; name modulations to the dominant, subdominant or relative minor; discuss texture and structure.
- **Entry rule for Grades 6–8:** ABRSM Grade 5 in Music Theory, Practical Musicianship, or a solo Jazz instrument.
- **Performance Grades** are an alternative: four pieces recorded on video in one continuous take, with no scales, sight-reading or aural tests.

**Trinity Piano, 2023 syllabus**
- **Marks, out of 100:**
  - three pieces at 22 each (66)
  - technical work at 14: scales and arpeggios plus Trinity's own exercises, which target tone, balance, voicing and coordination
  - two supporting tests at 10 each (20)
- **Result bands:** Pass 60, Merit 75, Distinction 87.
- **Supporting tests:**
  - Initial to Grade 5: choose two from sight reading, aural, improvisation and musical knowledge (the student is asked about their own pieces).
  - Grades 6–8: sight reading is compulsory, plus either aural or improvisation. Improvisation can be stylistic, harmonic or motivic.
- I found no Trinity theory prerequisite in my searches.
- Trinity also offers Digital Grades: three pieces plus either technical work or a performance-only pathway.

## 2. What the app actually does now

- **`flashcards.js`** has four decks, all using spaced repetition (Leitner boxes), and the student can answer by playing.
  - **Notes:** C4–A5 in treble, E2–C4 in bass. No notes beyond these ranges and no clef changes.
  - **Key signatures:** all 15.
  - **Intervals:** 2nds to octaves from 7 white-key roots. Only what falls out of the white keys, such as aug 4th and dim 5th.
  - **Triads:** white-key diatonic only, in all inversions. No chords with accidentals, no 7ths.
- **`pieces.js`:** four built-in items. C major right hand only, Ode to Joy right hand, a C–F–G triad drill, and Bach BWV 846 bars 1–4. Plus `app/scores/octave-study.musicxml`, an original study labelled "Grade 6 style".
- **`check.js`:**
  - Perform mode (count-in, play through, report) and Learn mode (waits on each note or chord).
  - Hands separately.
  - Drills the worst bar until it is clean three times in a row (`startDrill`).
  - Progressive tempo lock (`suggestedBpm`).
  - Gentle, Standard and Exam strictness.
  - Visual metronome, or an audible one with MIDI.
  - MusicXML import, capped at 6 scores (`MAX_IMPORTS`).
  - A mic test lab and a .wav download of the last take.
- **`analysis.js`:**
  - Aligns played notes to the score; fits the player's own tempo; follows rubato; flags rushing and dragging; handles ornaments and grace notes; picks the worst bar and one next step.
  - `checkMusicality` checks dynamics against the marks, a phrase that stays at one volume, top-note voicing, staccato length, legato gaps under slurs, and pedal changes. **MIDI only.**
- **`micanalysis.js`:** checks notes and chords against the score using onset detection and harmonic evidence. Tested only on synthetic audio; the PLAN says real pianos are unproven. It can't tell an octave below from both octaves. No dynamics, tone or pedal judgement from the mic.
- **`musicxml.js`:** imports 1–2 staves, ties, repeats with endings, dynamics, slurs, ornaments, fingering and pedal. **It does not follow D.C. or D.S., and it only warns about time-signature changes.**
- **`render.js`:** draws a grand staff. No beams, slurs, hairpins or cross-staff notes.
- **`timer.js`:** timer, goal, streak, focus tags.
- **`app.js` `lessonPlan()`:** a three-item plan: C major scale, flashcards, next piece.
- **`welcome.js`:** stores the level and exam board. Neither changes any content yet.

## 3. Gap matrix

C = Covered, P = Partial, M = Missing.

| Requirement / skill | G1–2 | G3–5 | G6–8 | Evidence |
|---|---|---|---|---|
| Learn a piece's notes and rhythm | P | P | P | `check.js` Learn/Perform and `analysis.analyse`. Only works if the student has a MusicXML file |
| Exam-standard repertoire supplied | M | M | M | 5 items, none of them on a syllabus list |
| Practice method (looping, slow work, hands separately) | C | C | P | `startDrill`, `suggestedBpm`, hands filter. No "chunk bars X–Y" option |
| Steady pulse and tempo | C | C | C | `robustRegress`, drift, `findTempoChanges` |
| Rubato and style-appropriate timing | – | P | P | Follows tempo changes but can't tell good rubato from bad |
| Dynamics | P (MIDI) | P (MIDI) | P (MIDI) | `checkMusicality`. Nothing from the mic, which is the main input |
| Tone quality and colour | M | M | M | Can't be done from the mic in any meaningful way |
| Voicing | P (MIDI) | P (MIDI) | P (MIDI) | Top-note velocity check only, no inner voices |
| Articulation | P | P | P | Staccato and slur checks are MIDI only. Accents are parsed but not checked |
| Pedalling | – | P (MIDI) | P (MIDI) | CC64 against the marks. No half or flutter pedal, no una corda. The mic can't hear the pedal |
| Phrasing and shape | M | P | P | Only the "same volume throughout" warning |
| Ornaments | – | P | P | Absorbed so they aren't marked wrong, not judged for quality |
| Following repeats and D.C./D.S. | P | P | P | Repeats yes, D.C./D.S. no (`musicxml.js`) |
| Scales: keys and patterns needed for the grade | P (C major RH) | M | M | Only `c-scale`. No generator |
| Arpeggios, broken chords, 7ths, chromatic, whole-tone, 3rds/6ths, contrary motion | M | M | M | None |
| Scales from memory, legato/staccato, at speed | M | M | M | None |
| Trinity exercises | M | M | M | None, and they are copyrighted |
| Sight-reading: note naming | C | P | M | Ranges stop at A5 and E2. No 8va, no clef changes |
| Sight-reading: unseen pieces with a 30-second prep | M | M | M | None |
| Rhythm reading (dotted, ties, 6/8, syncopation, triplets, 5/8, 7/8) | M | M | M | None |
| Key signatures | C | C | C | `keyCards` |
| Intervals (theory) | P | P | M | No compound or augmented/diminished intervals beyond the white-key ones |
| Chords (theory) | P | P | M | No 7ths, cadences, Roman numerals or figured inversions |
| Aural: pulse and time | M | M | M | None |
| Aural: sing or play back, sight-singing | M | M | M | None. The mic can't hear singing yet (pitch tracking is piano-tuned) |
| Aural: cadences, chords, modulation | – | – | M | None |
| Aural: describing features, style and period | M | M | M | None |
| Trinity improvisation | M | M | M | None |
| Trinity musical knowledge | M | M | M | None |
| ABRSM Grade 5 Theory (or an alternative) | – | M | M (needed for entry) | Flashcards cover perhaps 10% |
| Posture, hand shape, wrist, tension | M | M | M | Beyond the mic. PLAN §2 says so |
| Fingering | P (shown) | P | P | Shown from MusicXML (`render.js`), never checked |
| Memory | M | M | M | No "hide the score" mode. ABRSM scales must be played from memory |
| Performance nerves, play-through habits | P | P | P | The "you stopped at bar N" message |
| Mock exam, readiness, mark estimate | M | M | M | `ready` flag per piece only |
| Recording and self-review | P | P | P | .wav download in the test lab only |
| Curriculum and progression by grade | M | M | M | `lessonPlan()` is a three-item v0 |

## 4. What the app fundamentally can't do

- **Phone mic:** it can confirm notes and timing (once validated on real pianos).
  - Roughly: absolute loudness, only relative.
  - Badly: tone colour, voicing in pedalled textures, legato versus a pedal blur, half-pedalling, una corda. The mic also confuses an octave below with both octaves, and a missing upper note of an octave goes unnoticed (0–2 caught out of 10 in tests).
  - These are exactly the Grade 6–8 "tone and shape" marks.
- **Posture, wrist height, tension and arm weight:** these cause injury and plateaus, and audio is blind to them.
  - **Partial substitutes:**
    - On-device MediaPipe Hands or Pose for crude checks such as a collapsed wrist, flat fingers or raised shoulders.
    - Video recording with a guided self-check checklist.
    - An async teacher review marketplace.
- **Fingering:** MediaPipe-based research gets around 82–95% on unambiguous notes from an overhead camera, with about 20% of notes ambiguous and needing human labels (PianoVAM, CTU thesis). A phone propped on the music stand gives a poor angle. Suitable as a hint only, never as a grade.
- **Interpretation and style:** an app can teach the rules (Baroque articulation, Classical phrasing) and play reference recordings. It can't judge whether a performance is convincing.

## 5. Features needed, in priority order

Effort: S < 1 week, M 1–3 weeks, L 1–2 months, XL more than 2 months. CS = can run fully client-side.

1. **Real-piano mic validation and re-tuning.** Gates everything. All grades. M. CS.
2. **Scale and arpeggio generator for every type, key and range,** to the 2025–26 ABRSM lists and the Trinity lists. All types, any octave count, hands together/separately/contrary, legato or staccato. Checked by the existing analyser. Scales component, 14–21% of ABRSM marks. L. CS. Legal to ship: scale requirements are facts.
3. **Scales "exam mode".** The app names a random scale, no score is shown (memory), and it checks evenness, speed against the guide tempo and articulation. M. CS.
4. **Exam-board profile that drives the content,** using `welcome.js`. S. CS.
5. **Sight-reading generator to ABRSM's published parameters** (length, metre, keys, features per grade), with a 30-second prep timer, a one-shot play and a mark. Rules-based melody and harmony generation plus difficulty control is the hardest content algorithm here. Sight-reading, 14%. XL. CS.
6. **Rhythm trainer.** Tap or clap the rhythm; the mic hears claps easily. 6/8, syncopation, triplets, irregular metres. Sight-reading and aural. M. CS.
7. **Aural: pulse and time** (clap along, say 2/3/4/6/8). Grades 1–8. M. CS.
8. **Aural: sing-back and play-back from memory.** Needs voice pitch tracking (YIN or pYIN). L. CS.
9. **Aural: sight-singing from score,** with a generated accompaniment. Grades 4–8. L. CS.
10. **Aural: cadences, chords and modulations** generated from a voice-leading engine. Grades 6–8. L. CS.
11. **Aural: "features of a piece" quiz.** Needs licensed or public-domain recordings tagged for dynamics, style and period, texture and structure. L. Content-heavy.
12. **Grade 5 Theory course** (or Practical Musicianship prep). Note values, keys up to 7 sharps or flats, all intervals, chords and cadences, transposition, ornaments, terms, SATB basics. Unlocks entry to Grades 6–8. XL. CS.
13. **Flashcard extensions.** Ledger lines beyond A5 and E2, alto and tenor clefs for theory, chromatic triads, 7ths, compound intervals, Italian terms and signs. S–M. CS.
14. **Public-domain graded repertoire library,** about 15 pieces per grade, in MusicXML with fingering added by the developer. Bach (Anna Magdalena), Clementi and Kuhlau sonatinas, Burgmüller, Czerny, Schumann Op. 68, Tchaikovsky Op. 39, Gurlitt, Grieg, Bartók's Mikrokosmos only where public domain in the UK. Pieces. XL of content work. CS.
15. **Own-composed studies per grade** mirroring the technical skills that exercises target, as a replacement for the copyrighted Trinity exercises. Trinity technical work. L. CS.
16. **Exam-piece workflow** for copyrighted pieces the student owns: import MusicXML (rarely available), or photo OMR with a confirm step. Without this the exam pieces themselves are unsupported. L–XL. Server-side.
17. **Follow D.C. and D.S. and support mid-piece time-signature changes** in `musicxml.js`. Required for real exam pieces. M. CS.
18. **Notation upgrades:** beams, slurs, hairpins, cross-staff, 8va, clef changes, tuplets. Reading real scores and sight-reading at Grade 3 and up. L. CS.
19. **Mic dynamics:** RMS envelope normalised by calibration, relative to the student's own range. Dynamics on acoustic pianos. M. CS.
20. **Mic pedal detection,** by spectral sustain heuristics. Low confidence, so a hint only. Grades 4–8. L. CS.
21. **Memory mode.** Fade the score out bar by bar. Scales; Performance Grades. S. CS.
22. **Section practice tools:** loop bars X–Y, chunk forward or backward, rhythm variants, a cumulative "add one bar" mode. All grades. M. CS.
23. **Mock exam.** Three pieces, random scales, unseen sight-reading and aural tests in exam order, then an estimated mark band (with a clear caveat). Nerves and readiness. M. CS.
24. **Video recording and self-review** against the examiner's five criteria (pitch, time, tone, shape, performance) as a checklist. Doubles as practice for Performance Grade videos. M. CS.
25. **Async teacher review service:** the student uploads a video and gets back timestamped comments. The only honest fix for technique and tone. XL. Server-side, with safeguarding and consent for under-18s.
26. **MediaPipe hand and pose checks** (wrist collapse, flat fingers, shoulders) as hints. L. CS via WASM, but heavy on the phone.
27. **Technique video lessons and guided warm-ups:** posture, relaxation, thumb under, rotation, finger independence, octave technique. M–L of content.
28. **Style and period guides per list** (Baroque, Classical, Romantic, 20th century, jazz styles). Interpretation and aural style questions. M of content.
29. **Trinity improvisation trainer:** generated stylistic, harmonic and motivic stimuli, a 30-second prep, record, then a self-rating rubric and simple analysis (stays in key, keeps the pulse). L. CS.
30. **Trinity musical knowledge quiz:** questions generated from the imported piece's MusicXML (key, time, terms, structure). M. CS.
31. **Curriculum engine:** a week-by-week plan from Grade 1 to Grade 8 mapped to components, replacing `lessonPlan()`. XL of content.
32. **Sampled piano for reference playback** in place of the synth (`audio.js`). Needed for aural and for modelling tone. M. CS (Salamander samples, CC-BY).
33. **Audible metronome in mic mode** through headphones, with latency compensation. S–M. CS.
34. **iOS MIDI via a Capacitor wrapper.** All grades. L.
35. **Theory exam practice in the online-exam format** for ABRSM's Grade 5 theory. M. CS.
36. **Practice-quality analytics:** time per component compared with the exam weightings. S. CS.

**Content and copyright**
- **Can ship:**
  - Scales and arpeggio requirements, which are facts.
  - Generated sight-reading and aural material.
  - Your own studies.
  - Works whose composers died more than 70 years ago (UK term is life + 70), typeset by you. Don't copy modern editions: the UK protects an edition's typography for 25 years, and editorial fingering can carry its own copyright.
  - Mutopia files under their stated licences.
- **Can't ship:**
  - ABRSM or Trinity exam books, or their arrangements. The lists include pop arrangements such as Capaldi's "Someone You Loved", Hisaishi and Ikeda, all in copyright.
  - Trinity's exercises.
  - ABRSM specimen sight-reading and aural tests.
  - Exam recordings.
- **Wording:** describe the app as "follows the ABRSM/Trinity grade structure", never "official". PLAN §0 already says this.
- **Student-imported pieces:** keep them private to the device and never shareable.

## 6. Verdict

- **Coverage now.** Weighted by ABRSM marks: pieces are about 30–35% covered for note and timing accuracy (MIDI; less on the mic, and only if the student has a MusicXML file), scales about 3%, sight-reading about 10% (note naming), aural 0%. That works out to about 20% at Grades 1–2, about 15% at Grades 3–5 and about 10% at Grades 6–8, not counting the Grade 5 theory gate, which is about 10% covered. **Overall, roughly 12–15% of Grades 1–8.** The checking engine is far ahead of the content. It is a strong tool for practising pieces, not an exam course.
- **Minimum to claim "Grade 1–5 without a teacher" credibly** (all of these, at Grades 1–5): items 1–8, 12 (to Grade 5), 13, 14, 17, 18, 21, 22, 23, 24, 27 and 31, plus a mic proven on real pianos. Even then, add an explicit caveat: "technique and tone can't be checked, so get an occasional lesson or video review." With that caveat the claim is honest. Without it, it isn't: Grades 1–5 can be passed with self-taught technique, but bad habits form undetected.
- **"Grade 1–8 with only this app" is not an honest claim**, now or after the roadmap. Grade 6–8 marks rest heavily on tone, voicing, pedalling, shape and style, which the phone mic can't judge reliably. Exam pieces are copyrighted and can't ship. Posture and tension injuries are a real risk at advanced repertoire. Honest alternatives:
  - "Everything you need to *practise* for Grades 1–8, with a teacher or reviewer checking in"
  - "Grades 1–5 self-study, with optional video review for 6–8"

  This matches PLAN §1: "Replaces a teacher" is a claim you'll lose.

## Sources
- [ABRSM Piano Practical Grades Qualification Specification 2025–2026 (PDF, retailer copy)](https://caswells-strings.co.uk/wp-content/uploads/2025/07/ABRSM-Piano-syllabus-2025-2026.pdf): marks, bands, scales, sight-reading parameters, aural tests, Grade 5 prerequisite
- [Presto: ABRSM Performance Grade exams](https://live.prestomusic.com/sheet-music/articles/4204--exam-materials-abrsm-performance-grade-exams)
- [Music Teacher: ABRSM Practical Musicianship](https://musicteachermagazine.co.uk/content/features/in-practical-terms-abrsms-practical-musicianship-exam)
- [Trinity: Supporting tests](https://www.trinitycollege.com/qualifications/music/grade-exams/about/supporting-tests/)
- [Trinity: Introduction to Technical Work](https://trinitycollege.com/qualifications/music/grade-exams/piano/resources/piano-technical-work/introduction-technical-work)
- [Trinity piano syllabus resource](https://trinitycollege.com/resource?id=9079) and [sample booklet](https://www.trinitycollege.com/resource?id=9080): 66/14/20 marks, sight reading compulsory at Grades 6–8. The bands come from the 2021–23 booklet, and Trinity's lack of a theory prerequisite was not confirmed by any source, so check both against the current 2023 syllabus.
- [Trinity blog: technical work and supporting tests](https://blog.trinitycollege.co.uk/beyond-pieces-highlighting-the-importance-of-technical-work-supporting-tests-and-the-overall-performance-criteria)
- [PianoVAM (arXiv 2509.08800)](https://arxiv.org/pdf/2509.08800), [Web toolkits for fingering annotation (arXiv 2509.15222)](https://arxiv.org/pdf/2509.15222), [CTU fingering thesis](https://dspace.cvut.cz/handle/10467/115598)
- [ABRSM Piano Exam Pieces 2027–2028 listing](https://caswells-strings.co.uk/product/abrsm-piano-exam-pieces-2027-2028-grade-4/): a new syllabus is coming, so the scale and key tables will need updating
