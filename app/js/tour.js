// "Show me around": a spotlight tour of the real screens, one short step at a time.
// Never starts by itself (offered on Today and in Settings); Skip and Esc end it, and
// steps whose part of the screen isn't there (no piece yet, say) are skipped.
import { save } from './store.js';
import { still } from './settings.js';

const STEPS = [
  { tab: 'today', at: '.shelf', title: 'Your pieces', text: 'Every piece you add stands on this shelf. Tap one to see how it\'s going, then Perform to play it through or Learn to go slowly.' },
  { tab: 'today', at: '.today-plan', title: 'Your plan for today', text: 'Each day Stave builds a short plan from your grade, your exam and the bars you keep getting wrong. Tap any line to go straight to it.' },
  { tab: 'today', at: '#today-timer', title: 'Start practice', text: 'Starts the practice timer. Your minutes count towards the daily goal at the top of the plan.' },
  { tab: 'today', at: '.stat-strip', title: 'Your progress', text: 'The streak counts days with real progress: a clean run, a bar fixed, or 20 notes read. One rest day a week won\'t break it. Tap here for your full stats.' },
  { tab: 'cards', at: '.flashcard', title: 'Read: note flashcards', text: 'Name the note. Tap the card to check, then swipe right if you knew it and left if you didn\'t. Notes you miss come back more often.' },
  { tab: 'cards', at: '#card-deck', title: 'Choose what to practise', text: 'Notes, key signatures, intervals or chords, in treble or bass clef. You can also answer by playing the note on the keys.' },
  { tab: 'practice', at: '.timer-ring', title: 'Practise: the timer', text: 'Time a practice session and see your week. Pick what you\'re working on first, so your teacher can see where the time went.' },
  { tab: 'play', at: '#perf-empty .btn.primary', title: 'Perform: add your piece', text: 'Stave checks you against the real score. Add your piece as a MusicXML file from your teacher or MuseScore, and it appears here.' },
  { tab: 'play', at: '.piece-bar', title: 'Perform: your pieces', text: 'Pick the piece to play. "+ Add a piece" brings in another MusicXML file.' },
  { tab: 'play', at: '#input-pill', title: 'How Stave listens', text: 'Set up the microphone once for each piano (about 20 seconds), or plug in a MIDI keyboard. Tap this line any time to fix it.' },
  { tab: 'play', at: '.perf-actions', title: 'Play it through', text: 'Press Start, wait for four count-in clicks, then play. Afterwards every note is coloured: green right, red wrong, orange early or late, dashed missed.' },
  { tab: 'play', at: '#perf-options-open', title: 'Options', text: 'Tempo, metronome, exam conditions and how strict the checking is all live here.' },
  { tab: 'exam', at: '#exam-setup .segmented, #view-exam .exam-head', title: 'Exam', text: 'Add your exam date and board. Stave counts down, sets targets each week and shows how ready each piece is. Doing a Performance Grade? Choose Pieces only.' },
  { tab: null, at: '#top-avatar', title: 'Account and settings', text: 'Back up your progress, join your teacher, switch between Day and Night, and replay this tour whenever you like.' },
];

const visible = (el) => el && el.getClientRects().length > 0 && !el.closest('[hidden]');

export function startTour({ show, onEnd = () => {} }) {
  const shade = document.createElement('div');
  shade.className = 'tour-spot';
  shade.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div');
  box.className = 'card tour-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'tour-title');
  const blocker = document.createElement('div');
  blocker.className = 'tour-blocker'; // the screen under the tour isn't tappable
  document.body.append(blocker, shade, box);
  let i = -1;
  let n = 0; // steps actually shown, for the counter (some are skipped)
  let target = null;
  const onResize = () => place();

  const place = (fit = false) => {
    if (!target) return;
    let r = target.getBoundingClientRect();
    // Too tall for the callout above or below it: scroll it to sit just under the callout.
    const need = box.offsetHeight + 28;
    if (fit && r.bottom + need > innerHeight - 90 && r.top - need < 12) {
      scrollBy({ top: r.top - (12 + need), behavior: 'auto' });
      r = target.getBoundingClientRect();
    }
    const pad = 6;
    Object.assign(shade.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const w = Math.min(340, innerWidth - 32);
    const below = r.bottom + 14;
    const h = box.offsetHeight;
    const top = below + h < innerHeight - 90 ? below : Math.max(12, r.top - h - 14);
    Object.assign(box.style, { width: `${w}px`, left: `${Math.min(Math.max(16, r.left + r.width / 2 - w / 2), innerWidth - w - 16)}px`, top: `${top}px` });
  };

  function end(done) {
    removeEventListener('resize', onResize);

    removeEventListener('keydown', keys, true);
    shade.remove(); box.remove(); blocker.remove();
    save('tourDone', true);
    onEnd(done);
  }

  function go(dir) {
    let k = i + dir;
    // Skip steps whose part of the screen isn't showing (e.g. no piece added yet).
    while (k >= 0 && k < STEPS.length) {
      const s = STEPS[k];
      if (s.tab) show(s.tab);
      const el = document.querySelector(s.at);
      if (visible(el)) { i = k; target = el; break; }
      k += dir;
    }
    if (k < 0) return;
    if (k >= STEPS.length) return end(true);
    const s = STEPS[i];
    n += dir;
    box.innerHTML = `
      <p class="tour-count">Step ${n}</p>
      <h3 id="tour-title">${s.title}</h3>
      <p>${s.text}</p>
      <div class="row between">
        <button class="btn ghost link" type="button" data-skip>Skip tour</button>
        <div class="row gap">${i > 0 ? '<button class="btn small-btn" type="button" data-back>Back</button>' : ''}<button class="btn primary small-btn" type="button" data-next>${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>
      </div>`;
    box.querySelector('[data-skip]').addEventListener('click', () => end(false));
    box.querySelector('[data-back]')?.addEventListener('click', () => go(-1));
    box.querySelector('[data-next]').addEventListener('click', () => go(1));
    target.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' });
    place();
    setTimeout(() => place(true), still() ? 0 : 380); // after the scroll settles
    box.querySelector('[data-next]').focus({ preventScroll: true });
  }

  const keys = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); end(false); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  addEventListener('resize', onResize);
  addEventListener('keydown', keys, true);
  go(1);
}
