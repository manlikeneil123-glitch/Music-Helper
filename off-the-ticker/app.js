// No-repeat draw: pick an unseen topic from the pool; when the pool is used up, forget only that pool.
function drawTopic(pool, seen, rand = Math.random) {
  let unseen = pool.filter((t) => !seen.has(t));
  let reshuffled = false;
  if (!unseen.length) {
    pool.forEach((t) => seen.delete(t));
    unseen = pool;
    reshuffled = true;
  }
  const topic = unseen[Math.floor(rand() * unseen.length)];
  seen.add(topic);
  return { topic, reshuffled };
}

if (typeof document === 'undefined') {
  module.exports = { drawTopic };
} else {
  main();
}

function main() {
  const T = window.TOPICS;
  const uniq = (a) => [...new Set(a)];
  const POOLS = {
    all: uniq(['economics', 'stocks', 'finance', 'ai', 'entrepreneurship'].flatMap((k) => T[k])),
    economics: uniq(T.economics),
    stocks: uniq(T.stocks),
    finance: uniq(T.finance),
    ai: uniq(T.ai),
    entrepreneurship: uniq(T.entrepreneurship),
    deep: uniq(T.deep),
  };
  const TOTAL = uniq([...POOLS.all, ...POOLS.deep]).length;
  const BLURBS = {
    cuff: 'Minimal prep. Think fast and talk.',
    deep: "Spin a topic, run a research timer, then start the speech timer when you're ready.",
  };
  const SPIN_MS = 4800;

  // Storage: every access is wrapped, since private windows can throw.
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ott:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ott:' + k, JSON.stringify(v)); } catch {} },
  };
  const clampMin = (v, max, d) => (Number.isFinite(v) ? Math.min(max, Math.max(1, Math.round(v))) : d);

  const state = {
    mode: 'cuff',
    category: store.get('category', 'all'),
    speechMin: clampMin(store.get('speechMin', 1), 10, 1),
    researchMin: clampMin(store.get('researchMin', 10), 60, 10),
    muted: store.get('muted', false) === true,
    seen: new Set(store.get('seen', [])),
    topic: null,
    spinning: false,
    phase: 'idle', // idle | research | ready | speech | done
  };
  if (!POOLS[state.category]) state.category = 'all';

  const $ = (id) => document.getElementById(id);
  const el = {
    reel: $('reel'), eyebrow: $('eyebrow'), phrase: $('phrase'), announce: $('announce'), deckNote: $('deck-note'),
    spin: $('spin'), start: $('start'), category: $('category'), blurb: $('blurb'),
    modeSwitch: document.querySelector('.mode-switch'), modes: document.querySelectorAll('.mode-option'),
    settings: $('settings'), openSettings: $('open-settings'), speechMin: $('speech-min'), researchMin: $('research-min'),
    muted: $('muted'), seenCount: $('seen-count'), resetSeen: $('reset-seen'),
    timer: $('timer'), timerTopic: $('timer-topic'), timerPhase: $('timer-phase'), stages: $('stages'),
    ring: $('ring'), digits: $('digits'), timerStatus: $('timer-status'), timerNext: $('timer-next'), timerClose: $('timer-close'),
  };

  // --- Sound: tiny WebAudio blips, no files.
  let ctx = null;
  function beep(freq, dur, vol = 0.08, type = 'sine') {
    if (state.muted) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch {}
  }
  const sfx = {
    tick: (v) => beep(1400, 0.04, 0.05 * v, 'square'),
    land: () => { beep(660, 0.18); setTimeout(() => beep(990, 0.3), 110); },
    go: () => beep(520, 0.15, 0.08, 'triangle'),
    done: () => { beep(880, 0.35, 0.1); setTimeout(() => beep(880, 0.35, 0.1), 400); setTimeout(() => beep(1320, 0.6, 0.1), 800); },
  };

  // --- Rendering
  const pool = () => POOLS[state.mode === 'deep' ? 'deep' : state.category];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const busy = () => state.spinning || state.phase !== 'idle';

  function renderControls() {
    el.modes.forEach((b) => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on);
      b.disabled = busy();
    });
    el.modeSwitch.style.setProperty('--i', state.mode === 'deep' ? 1 : 0);
    el.blurb.textContent = BLURBS[state.mode];
    el.category.hidden = state.mode === 'deep';
    el.category.value = state.category;
    el.category.disabled = el.spin.disabled = el.openSettings.disabled = busy();
    el.spin.textContent = state.spinning ? 'Spinning…' : state.topic ? 'Spin again' : 'Spin';
    el.start.disabled = !state.topic || busy();
    el.start.textContent = state.mode === 'deep' ? `Start ${state.researchMin} min research` : `Start ${state.speechMin} min timer`;
    const p = pool(), left = p.filter((t) => !state.seen.has(t)).length;
    el.deckNote.textContent = `${left.toLocaleString()} of ${p.length.toLocaleString()} topics left in this deck`;
  }

  function showIdleTopic() {
    const p = pool();
    state.topic = null;
    el.reel.className = 'reel';
    el.eyebrow.textContent = 'Ready';
    el.phrase.textContent = p[Math.floor(Math.random() * p.length)];
    renderControls();
  }

  // --- Spin: ease-out cubic ticks through random fillers, then lands on the drawn topic.
  function spin() {
    if (busy()) return;
    const p = pool();
    const { topic, reshuffled } = drawTopic(p, state.seen);
    store.set('seen', [...state.seen]);
    state.spinning = true;
    state.topic = null;
    el.reel.className = 'reel is-spinning';
    el.eyebrow.textContent = 'Drawing…';
    el.announce.textContent = '';
    renderControls();

    const steps = 28 + Math.floor(Math.random() * 10);
    const t0 = performance.now();
    let last = -1;
    const frame = (now) => {
      const x = Math.min(1, (now - t0) / SPIN_MS);
      const step = Math.floor((1 - (1 - x) ** 3) * steps);
      if (step !== last && x < 1) {
        last = step;
        el.phrase.textContent = p[Math.floor(Math.random() * p.length)];
        el.phrase.style.animation = 'none'; void el.phrase.offsetWidth; el.phrase.style.animation = '';
        sfx.tick(1 - x * 0.6);
      }
      if (x < 1) return requestAnimationFrame(frame);
      state.spinning = false;
      state.topic = topic;
      el.phrase.textContent = topic;
      el.reel.className = 'reel is-landed';
      el.eyebrow.textContent = 'Your topic';
      el.announce.textContent = `Your topic: ${topic}`;
      renderControls();
      if (reshuffled) el.deckNote.textContent = `You've seen every topic in this deck. Reshuffled.`;
      sfx.land();
    };
    requestAnimationFrame(frame);
  }

  // --- Timer overlay
  let interval = null, total = 0, lastFocus = null;
  function runTimer(seconds, onEnd) {
    clearInterval(interval);
    total = seconds;
    const end = Date.now() + seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      el.digits.textContent = fmt(left);
      el.ring.style.setProperty('--p', 1 - left / total);
      if (state.phase === 'speech') {
        const hit = Math.min(3, Math.floor(((total - left) / total) * 3) + 1);
        [...el.stages.children].forEach((li, i) => li.classList.toggle('is-hit', i < hit));
      }
      if (left <= 0) { clearInterval(interval); onEnd(); }
    };
    tick();
    interval = setInterval(tick, 100);
  }

  function setPhase(phase) {
    state.phase = phase;
    const t = el.timer;
    t.hidden = phase === 'idle';
    t.className = `timer-overlay is-${phase}`;
    el.timerTopic.textContent = state.topic || '';
    el.timerPhase.textContent = phase === 'research' ? 'Researching' : '';
    el.stages.hidden = !(state.mode === 'cuff' && (phase === 'speech' || phase === 'done'));
    el.timerStatus.textContent = { research: 'Research.', ready: `Research done. Up next: ${state.speechMin} min to speak.`, speech: 'Speak.', done: 'Time.' }[phase] || '';
    el.timerNext.hidden = !(phase === 'research' || phase === 'ready');
    el.timerNext.textContent = phase === 'research' ? 'Done researching' : "I'm ready to speak";
    if (phase === 'ready') { el.digits.textContent = fmt(state.speechMin * 60); el.ring.style.setProperty('--p', 0); }
    if (phase === 'done') [...el.stages.children].forEach((li) => li.classList.add('is-hit'));
    document.querySelector('.page').inert = phase !== 'idle';
    renderControls();
    if (phase === 'idle') { clearInterval(interval); lastFocus?.focus(); }
    else (el.timerNext.hidden ? el.timerClose : el.timerNext).focus();
  }

  function startSpeech() {
    sfx.go();
    setPhase('speech');
    runTimer(state.speechMin * 60, () => { setPhase('done'); sfx.done(); });
  }

  function start() {
    if (!state.topic || busy()) return;
    lastFocus = document.activeElement;
    if (state.mode === 'deep') {
      sfx.go();
      setPhase('research');
      runTimer(state.researchMin * 60, () => { setPhase('ready'); sfx.done(); });
    } else startSpeech();
  }

  // --- Settings
  function renderSeen() {
    el.seenCount.textContent = `${state.seen.size.toLocaleString()} of ${TOTAL.toLocaleString()} topics seen`;
  }

  // --- Events
  el.spin.addEventListener('click', spin);
  el.start.addEventListener('click', start);
  el.modes.forEach((b) => b.addEventListener('click', () => {
    if (busy() || b.dataset.mode === state.mode) return;
    state.mode = b.dataset.mode;
    showIdleTopic();
  }));
  el.category.addEventListener('change', () => {
    state.category = el.category.value;
    store.set('category', state.category);
    showIdleTopic();
  });
  el.timerNext.addEventListener('click', () => {
    if (state.phase === 'research') { clearInterval(interval); setPhase('ready'); sfx.go(); }
    else if (state.phase === 'ready') startSpeech();
  });
  el.timerClose.addEventListener('click', () => setPhase('idle'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.phase !== 'idle') setPhase('idle');
  });

  el.openSettings.addEventListener('click', () => {
    el.speechMin.value = state.speechMin;
    el.researchMin.value = state.researchMin;
    el.muted.checked = state.muted;
    renderSeen();
    el.settings.showModal();
  });
  el.settings.addEventListener('click', (e) => { if (e.target === el.settings) el.settings.close(); });
  el.settings.addEventListener('close', () => {
    state.speechMin = clampMin(el.speechMin.valueAsNumber, 10, state.speechMin);
    state.researchMin = clampMin(el.researchMin.valueAsNumber, 60, state.researchMin);
    state.muted = el.muted.checked;
    store.set('speechMin', state.speechMin);
    store.set('researchMin', state.researchMin);
    store.set('muted', state.muted);
    renderControls();
  });
  el.resetSeen.addEventListener('click', () => {
    state.seen.clear();
    store.set('seen', []);
    renderSeen();
  });

  showIdleTopic();
}
