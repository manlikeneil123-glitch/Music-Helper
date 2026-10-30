// Performance Grade recorder: one continuous video take of the whole programme, with
// a framing guide, saved to the phone only. Nothing is uploaded — the student submits
// it to the exam board themselves. Rules shown are a checklist, not legal advice: the
// student is pointed to the board's own guidance before submitting.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const CRITERIA = ['Pitch: right notes', 'Time: steady pulse, no stopping', 'Tone: a good sound', 'Shape: dynamics and phrasing', 'Performance: character and confidence'];

const pickType = () => ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtSize = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** exam: { board, grade, pieces: [{ title }] } */
export function openPerformanceRecorder(exam) {
  const grade = exam.grade === 'Initial' ? 0 : Number(exam.grade);
  const dlg = document.createElement('dialog');
  dlg.className = 'card pg-dialog';
  let stream = null;
  let rec = null;
  let chunks = [];
  let started = 0;
  let tick = null;
  let facing = 'environment';
  let url = null;

  const checklist = `
    <ul class="pg-list">
      <li>One continuous take: no stopping the recording between pieces, no editing.</li>
      <li>Your face, both hands, your feet (pedal) and the whole keyboard in view.</li>
      ${grade >= 6 ? '<li>Grades 6–8: hold your photo ID up to the camera for about 5 seconds at the start.</li>' : ''}
      <li>Phone on a stand, landscape, about 2 m away and to the side. Good light in front of you, not behind.</li>
      <li>Your pieces, in order: ${exam.pieces.map((p, i) => esc(p.title || `Piece ${i + 1}`)).join(', ')}${exam.pieces.length < 4 ? ', plus the rest of your programme' : ''}.</li>
    </ul>
    <p class="muted small">Check the exam board's current Performance Grade guidance before you submit; rules change. This recording stays on your phone: Stave never uploads it.</p>`;

  const stage = (html) => { dlg.querySelector('.pg-body').innerHTML = html; };
  dlg.innerHTML = `
    <div class="row between"><h3>Performance Grade recorder</h3><button class="btn small-btn" type="button" data-close>Close</button></div>
    <div class="pg-body"></div>`;

  function intro() {
    stage(`${checklist}<button class="btn primary block" type="button" data-open>Open the camera</button>`);
    dlg.querySelector('[data-open]').addEventListener('click', openCamera);
  }

  async function openCamera() {
    try {
      stream?.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        // Same as the checker: phone voice processing ruins piano sound.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      stage(`<p class="error">The camera or microphone was blocked. Allow both for this page in your browser settings, then try again.</p><button class="btn block" type="button" data-retry>Try again</button>`);
      dlg.querySelector('[data-retry]').addEventListener('click', openCamera);
      return;
    }
    stage(`
      <div class="pg-frame">
        <video autoplay muted playsinline></video>
        <div class="pg-guide" aria-hidden="true"><span class="face">face</span><span class="keys">hands · keyboard · feet</span></div>
        <span class="pg-timer" hidden></span>
      </div>
      <p class="muted small" id="pg-tip">Line up: your face in the top box, the keyboard and your feet in the bottom one.</p>
      <div class="row gap wrap">
        <button class="btn" type="button" data-flip>Switch camera</button>
        <button class="btn accent" type="button" data-rec>● Start recording</button>
      </div>`);
    dlg.querySelector('video').srcObject = stream;
    dlg.querySelector('[data-flip]').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; openCamera(); });
    dlg.querySelector('[data-rec]').addEventListener('click', toggle);
  }

  function toggle() {
    const btn = dlg.querySelector('[data-rec]');
    if (rec) return finish();
    const type = pickType();
    try {
      rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 });
    } catch {
      return stage('<p class="error">This browser can\'t record video. Use your phone\'s own camera app instead.</p>');
    }
    chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(1000);
    started = Date.now();
    btn.textContent = '■ Stop (end of the whole programme)';
    btn.classList.remove('accent');
    btn.classList.add('bad');
    dlg.querySelector('[data-flip]').disabled = true;
    const timer = dlg.querySelector('.pg-timer');
    timer.hidden = false;
    dlg.querySelector('#pg-tip').textContent = grade >= 6 ? 'Recording. Show your photo ID first, then play everything without stopping the recording.' : 'Recording. Play everything without stopping the recording.';
    tick = setInterval(() => { timer.textContent = `● ${fmtTime((Date.now() - started) / 1000)}`; }, 500);
  }

  function finish() {
    if (!confirm('Stop recording? Only stop at the end of your whole programme: the take must be continuous.')) return;
    clearInterval(tick);
    const seconds = (Date.now() - started) / 1000;
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || 'video/mp4' });
      rec = null;
      stream.getTracks().forEach((t) => t.stop());
      url = URL.createObjectURL(blob);
      const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
      const name = `performance-grade-${new Date().toISOString().slice(0, 10)}.${ext}`;
      const file = new File([blob], name, { type: blob.type });
      stage(`
        <video controls playsinline src="${url}" class="pg-review"></video>
        <p class="small">${fmtTime(seconds)} · ${fmtSize(blob.size)}${blob.size > 2e9 ? ' <span class="error">(over 2 GB: too big to upload)</span>' : ''}</p>
        <div class="row gap wrap">
          <button class="btn primary" type="button" data-share>Save to Photos / Files</button>
          <a class="btn" href="${url}" download="${name}">Download</a>
          <button class="btn" type="button" data-again>Record again</button>
        </div>
        <h4>Watch it back like an examiner</h4>
        <p class="muted small">Tick what you're happy with. Anything unticked is this week's practice.</p>
        <ul class="pg-criteria">${CRITERIA.map((c, i) => `<li><label><input type="checkbox" data-c="${i}"> ${c}</label></li>`).join('')}</ul>
        <ul class="pg-list"><li>Face, hands, feet and keyboard visible all the way through?</li><li>No cuts or pauses in the recording?</li>${grade >= 6 ? '<li>ID shown clearly at the start?</li>' : ''}</ul>`);
      const share = dlg.querySelector('[data-share]');
      if (!navigator.canShare?.({ files: [file] })) share.hidden = true;
      share.addEventListener('click', async () => {
        try { await navigator.share({ files: [file], title: 'Performance Grade recording' }); } catch { /* dismissed */ }
      });
      dlg.querySelector('[data-again]').addEventListener('click', () => {
        if (!confirm('Record a new take? Save this one first if you might want it.')) return;
        URL.revokeObjectURL(url);
        url = null;
        openCamera();
      });
    };
    rec.stop();
  }

  const close = () => {
    if (rec && !confirm('You are still recording. Stop and throw this take away?')) return;
    clearInterval(tick);
    if (rec) { rec.onstop = null; rec.stop(); rec = null; }
    stream?.getTracks().forEach((t) => t.stop());
    if (url) URL.revokeObjectURL(url);
    dlg.close();
    dlg.remove();
  };
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  document.body.append(dlg);
  intro();
  dlg.showModal();
}
