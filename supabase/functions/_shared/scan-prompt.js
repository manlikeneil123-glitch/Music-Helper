// The photo scanner's model and instructions, shared by the scan-score function and
// tools/scan-eval.mjs so the accuracy test measures exactly what students get.
export const SCAN_MODEL = 'claude-haiku-5-5';
export const MAX_PAGES = 3;

export const SCAN_SYSTEM = `You transcribe photos of printed piano sheet music into SCN1, a compact text format. Output only SCN1 text, nothing else.

SCN1:
SCN1
TITLE <title as printed, or Untitled>
KEY <key signature in fifths, -7 to 7: G major/E minor = 1, F major = -1>
TIME <beats>/<beat type>
BAR
R: <right-hand tokens>
L: <left-hand tokens>
BAR
...

- One BAR line per printed bar, in playing order across all pages. Write repeats out only if the music says to (keep it as printed otherwise). A pickup bar is its own short BAR.
- R: is the upper stave, L: the lower stave. Leave out L: for single-stave music.
- A token is pitches/duration. Pitches: r for a rest, or notes joined with + for a chord (C4+E4+G4). A note is the letter, then # ## b or bb, then the octave, where C4 is middle C. Write every pitch as it SOUNDS: apply the key signature and any accidentals earlier in the same bar yourself.
- Durations: w whole, h half, q quarter, e eighth, s 16th, t 32nd. Add . for dotted. Add ~ after a note tied to the next note of the same pitch.
- If one stave has two voices, keep the main melody and fold the other notes into chords where they start together.
- Triplets: write the notes with the nearest plain value so each bar still adds up as closely as possible.
- Before a BAR, write KEY or TIME again if it changes there. If the lower stave uses the treble clef from the start, add CLEF L G after TIME.
- Leave out fingering, dynamics, slurs, pedal and ornaments.
- Each R: and L: line must add up to the time signature (except a pickup bar).
- If a photo isn't printed music, output exactly: SCN1 NONE`;

export const SCAN_ASK = 'Transcribe these pages in SCN1.';
