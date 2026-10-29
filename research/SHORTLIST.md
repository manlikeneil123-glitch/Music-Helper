# Feature shortlist (Oct 2026)

Merged and de-duplicated from three research passes: [competitors](competitors.md),
[USP](usp.md) and [Grade 1→8 audit](grade-1-to-8.md), plus issues found while building
accounts. Pick by number.

Effort for a solo dev: **S** < 1 week · **M** 1–3 weeks · **L** 1–2 months · **XL** > 2 months.
Impact: ★ low · ★★ medium · ★★★ high · ⛔ blocks other things.

## A. Foundations (nothing else is honest without these)
| # | Feature | Effort | Impact |
|---|---|---|---|
| A1 | Real-piano mic test set (~30 labelled recordings on 3+ pianos) and re-tuned thresholds | M | ⛔ |
| A2 | Lesson plan uses the stored grade and exam board (today it's ignored and always starts with C major) | S | ★★★ |
| A3 | Teacher can reset a student's forgotten password (no email means no self-reset) | S | ★★★ |
| A4 | Change password from the Account page | S | ★★ |
| A5 | Teacher verification before public launch (anyone can pick "Teacher" today) | S–M | ★★★ (safeguarding) |
| A6 | Supabase Pro before launch so the free project never pauses after a quiet week | — (£20/mo) | ★★★ |
| A7 | Privacy page for parents and teachers (Children's Code: what's stored, who sees it, delete) | S | ★★ |

## B. Exam readiness — the recommended USP ("Know which bars will cost you marks")
| # | Feature | Effort | Impact |
|---|---|---|---|
| B1 | Exam date + countdown planner: plans backwards (pieces, scales rotation, sight-reading, aural) | S–M | ★★★ |
| B2 | Scales & arpeggios generator for every grade, board and key (requirements are facts, no copyright), checked by the mic | L | ★★★ |
| B3 | "Examiner asks" scales mode: random call aloud, no score shown (memory), measures hesitation, evenness, speed vs guide tempo | M | ★★★ |
| B4 | Pitch & Time readiness band per piece, mapped to the published criteria (labelled "not an official mark") | M | ★★★ |
| B5 | Continuity score: stops, restarts, hesitations (examiners reward keeping going) | S | ★★★ |
| B6 | Steady-pulse score with no metronome (reuses the tempo-fit engine) | S | ★★★ |
| B7 | "Bars costing marks" heat-strip on the score across all runs this week | S | ★★★ |
| B8 | Mock exam: pieces → scales → sight-reading → aural in exam order, then a component summary | M | ★★★ |
| B9 | Syllabus tracker: list the grade's pieces by title, "my choices", readiness per component | S | ★★★ |
| B10 | Exam-room simulation: one take, no restarts, nerves warm-up | S | ★★ |
| B11 | Performance Grade recorder: framing guide, one continuous take, self-check against the criteria | M | ★★ |

## C. Teacher & parent (the moat and the distribution channel)
| # | Feature | Effort | Impact |
|---|---|---|---|
| C1 | Teacher assignments: piece, bars, target tempo, strictness, due date → drives the student's daily plan | M | ★★★ |
| C2 | Lesson-end "3 targets" typed by the teacher in the lesson; they become the week's plan | S | ★★★ |
| C3 | Weekly report card (image/PDF to WhatsApp): bars fixed, tempo ladder, clean runs — not minutes | S | ★★★ |
| C4 | Teacher shares their own MusicXML with their students only (avoids hosting copyrighted scores) | M | ★★★ |
| C5 | Teacher sees each student's weakest bars across the week, not only the last check | S | ★★★ |
| C6 | Hear recordings: student sends a take to the teacher (storage + consent for under-18s) | M | ★★ |
| C7 | Parent view: read-only weekly digest link (parents are the buyers) | S–M | ★★ |
| C8 | Lesson-day-aware plan: ramps up before the lesson, "what to show your teacher" | S | ★★ |
| C9 | No-account assignment link/QR (for teachers who won't make accounts) | S | ★★ |
| C10 | Opt-in studio leaderboard on clean runs (not minutes) | M | ★ |

## D. Practice method
| # | Feature | Effort | Impact |
|---|---|---|---|
| D1 | Loop bars X–Y, chunking, "add one bar" cumulative mode, rhythm variants | M | ★★★ |
| D2 | Spaced review of bars: last week's fixed bars come back for a quick check | S | ★★ |
| D3 | Memory mode: score fades bar by bar (scales and Performance Grades need memory) | S | ★★ |
| D4 | Read-ahead mode: bars disappear as you pass them | S | ★★ |
| D5 | Practice-quality streak (clean runs, bars fixed) instead of minutes | S | ★★ |
| D6 | Audible metronome in mic mode through headphones, with latency compensation | S–M | ★★ |
| D7 | Sampled piano sound for playback (Salamander, CC-BY) instead of the synth | M | ★★ |

## E. Mic & analysis
| # | Feature | Effort | Impact |
|---|---|---|---|
| E1 | Mic dynamics contour: relative loudness vs the score's p/f/hairpins, cautious wording | M | ★★ |
| E2 | Recovery-from-slips detection | S | ★★ |
| E3 | Mic pedal hint (spectral sustain heuristic, low confidence) | L | ★ |
| E4 | iOS MIDI via a native wrapper (Capacitor) — gives iPhone users dynamics/pedal checks | L | ★★ |
| E5 | MediaPipe hand/pose hints (collapsed wrist, flat fingers, raised shoulders) | L | ★ |

## F. Sight-reading, aural, theory, Trinity
| # | Feature | Effort | Impact |
|---|---|---|---|
| F1 | Sight-reading generator to ABRSM's published per-grade parameters, 30-second prep, one-shot marked run | XL | ★★★ |
| F2 | Rhythm trainer: clap/tap rhythms (claps are easy for the mic); 6/8, syncopation, triplets, 5/8, 7/8 | M | ★★★ |
| F3 | Aural: clap the pulse, name the time | M | ★★ |
| F4 | Aural: sing/play back from memory (voice pitch tracking) | L | ★★ |
| F5 | Aural G6–8: cadences, chords, modulations from a voice-leading engine | L | ★★ |
| F6 | Grade 5 Theory course (entry requirement for ABRSM Grades 6–8) on the flashcard engine | XL | ★★★ |
| F7 | Flashcard extensions: ledger lines beyond A5/E2, alto/tenor clefs, chromatic triads, 7ths, compound intervals, Italian terms | S–M | ★★ |
| F8 | Trinity musical-knowledge questions generated from the student's own piece | M | ★★ |
| F9 | Trinity improvisation prompts with a backing loop | M | ★ |

## G. Content & notation
| # | Feature | Effort | Impact |
|---|---|---|---|
| G1 | Public-domain graded library (~15 pieces per grade: Anna Magdalena, Clementi, Burgmüller, Czerny, Schumann Op. 68…) typeset fresh | XL | ★★★ |
| G2 | Own-composed technical studies per grade (stand-in for Trinity's copyrighted exercises) | L | ★★ |
| G3 | MusicXML: D.C./D.S. and mid-piece time-signature changes (needed for real exam pieces) | M | ★★★ |
| G4 | Notation: beams, slurs, hairpins, 8va, clef changes, tuplets | L | ★★ |
| G5 | Photo → score (OMR) with a confirm step — keep at V2; error rates break trust | L | ★ (now) |
| G6 | Style & period guides per list (Baroque, Classical, Romantic, 20th c., jazz) | M | ★ |
| G7 | Technique video lessons and warm-ups (posture, thumb under, rotation) | M–L | ★★ |

## H. Trust & business
| # | Feature | Effort | Impact |
|---|---|---|---|
| H1 | Honest billing: no trial trap, one-tap cancel (every big rival's Trustpilot is billing complaints) | S | ★★★ |
| H2 | App Store positioning: subtitle "Fix the bars that cost marks", exam-readiness description | S | ★★★ |
| H3 | Async teacher video review (paid add-on, the only honest fix for tone/technique) | XL | ★★ |
| H4 | Music hub / school licence channel (Charanga-style) | business | ★★★ later |

## I. Cut or hide (they dilute the USP)
| # | Change | Effort |
|---|---|---|
| I1 | Lead Today with "exam in N days · 3 bars to fix"; move streak/minutes/goal ring lower | S |
| I2 | Fold the timer into the session log instead of a main tab | S |
| I3 | Keep note flashcards; move key-signature/interval/chord decks under "Theory warm-up" | S |
| I4 | Hide on-screen/computer-key checking from Perform (keep for Learn and demos) | S |
| I5 | Put the mic Test lab and verdict chips behind "The mic got it wrong?" | S |
| I6 | Don't market MIDI-only musicality checks (iPhone users never see them) | — |
| I7 | Replace "Read. Practise. Perform." with the exam promise | S |
| I8 | Still frame instead of animated glass while analysing, to save CPU on cheap phones | S |

## J. Traps (don't build)
Pop song library (licensing; Simply Piano/Flowkey win) · XP and badges · AI chat tutor as a
headline · "Gives you your ABRSM mark" (not feasible, invites a trademark complaint) ·
"Grade 1–8 with only this app" (not honest: tone, pedalling, posture and copyrighted pieces).

## Threats to watch
SightReader (solo dev, mic+MIDI, free teacher dashboard) · Flowkey's ABRSM deal (if it adds a
teacher view) · Trinity NoteLab (free and official; if it adds automatic checking).
