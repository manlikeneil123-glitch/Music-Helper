// Scan a page: photos of printed music → a score, checked by the student before use.
// Two routes. Free: the student sends the photo and our message to an AI chat app they
// may use, then pastes the reply back (Stave sends nothing). Server: the scan-score
// function (supabase/functions/scan-score), off until SCAN_ENABLED in config.js, after
// tools/scan-eval.mjs shows it's accurate.
import { SCAN_ENABLED } from './config.js';
import { cloudReady, currentUser, scanPages } from './cloud.js';
import { scnToMusicXML, scnFromReply } from './scnformat.js';
import { SCAN_SYSTEM, SCAN_ASK } from './scanprompt.js';
import { bornOnDevice, under13 } from './age.js';
import { parseMusicXML } from './musicxml.js';
import { normalize, timeline } from './score.js';
import { renderScore } from './render.js';
import { audio, scheduleNote } from './audio.js';
import { expressivePlan } from './expressive.js';

const MAX_PAGES = 3;
const LONG_SIDE = 1800; // px: enough for noteheads, small enough to send quickly
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const scanAvailable = () => SCAN_ENABLED && cloudReady();

export const CHAT_PROMPT = `${SCAN_SYSTEM}\n\nPut the whole SCN1 in one code block. ${SCAN_ASK}`;


async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, LONG_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { url, media_type: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
}

/** onAdd(musicxml, title) imports the confirmed score. */
export function openScan({ onAdd, signIn }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'card sheet scan';
  dlg.setAttribute('aria-labelledby', 'scan-title');
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  let photos = [];

  const shell = (body) => {
    dlg.innerHTML = `<div class="row between"><h3 id="scan-title">Photo of the music</h3><button class="btn small-btn" type="button" data-x aria-label="Close">✕</button></div>${body}`;
    dlg.querySelector('[data-x]').addEventListener('click', () => dlg.close());
  };

  function pick() {
    if (!currentUser()) {
      shell(`<p>Scanning reads your music on our server, so it needs an account.</p><button class="btn primary block" type="button" data-in>Sign in or create an account</button><button class="btn block" type="button" data-chat>Use your own AI app instead</button>`);
      dlg.querySelector('[data-in]').addEventListener('click', () => { dlg.close(); signIn(); });
      dlg.querySelector('[data-chat]').addEventListener('click', chat);
      return;
    }
    shell(`
      <p>Take a photo of each page: flat, in good light, the whole width of the music in the frame. Up to ${MAX_PAGES} pages.</p>
      <label class="btn block" for="scan-files">Choose or take photos</label>
      <input id="scan-files" type="file" accept="image/*" multiple hidden>
      <div class="scan-thumbs">${photos.map((p, i) => `<img src="${p.url}" alt="Page ${i + 1}">`).join('')}</div>
      <p class="error" role="alert" hidden></p>
      <button class="btn primary block" type="button" data-go ${photos.length ? '' : 'disabled'}>Read the music</button>
      <p class="fine">Photos are sent to Anthropic's AI to read the notes, then deleted; they're never stored or shown to anyone. Only scan music you're allowed to copy, such as your own exam book for your own practice.</p>
      <button class="btn block" type="button" data-chat>Use your own AI app instead</button>`);
    dlg.querySelector('[data-chat]').addEventListener('click', chat);
    dlg.querySelector('#scan-files').addEventListener('change', async (e) => {
      const files = [...e.target.files].slice(0, MAX_PAGES);
      photos = await Promise.all(files.map(shrink)).catch(() => []);
      if (!photos.length) return error("Those photos couldn't be opened. Try taking them again.");
      pick();
    });
    dlg.querySelector('[data-go]').addEventListener('click', read);
  }

  // The free route: nothing leaves Stave; the student carries the photo and message over.
  function chat() {
    const kid = bornOnDevice() && under13(bornOnDevice());
    const reply = dlg.querySelector('#scan-reply')?.value ?? '';
    shell(`
      <ol class="steps">
        ${kid
          ? '<li>AI chat apps are for 13 and over, so ask a parent, carer or teacher to do the next two steps on their phone and send you the reply.</li><li>They open an AI chat app they\'re allowed to use, such as ChatGPT or Gemini.</li>'
          : '<li>Open an AI chat app you\'re allowed to use, such as ChatGPT or Gemini. Each has its own age rules: usually 13 and over, and under 18s may need a parent\'s OK.</li>'}
        <li>Attach a photo of each page (flat, in good light, the whole width of the music) and send it with this message:
          <button class="btn block" type="button" data-copy>Copy the message</button>
          <details><summary>See the message</summary><textarea class="scan-prompt" readonly rows="6" aria-label="The message to send">${esc(CHAT_PROMPT)}</textarea></details>
        </li>
        <li>Copy the whole reply and paste it here.</li>
      </ol>
      <label class="field">The reply <textarea id="scan-reply" rows="5" spellcheck="false" autocapitalize="off" placeholder="Starts with SCN1">${esc(reply)}</textarea></label>
      <label class="btn block" for="scan-files">${photos.length ? 'Change the photo' : 'Add your photo to compare (optional)'}</label>
      <input id="scan-files" type="file" accept="image/*" multiple hidden>
      <div class="scan-thumbs">${photos.map((p, i) => `<img src="${p.url}" alt="Page ${i + 1}">`).join('')}</div>
      <p class="error" role="alert" hidden></p>
      <button class="btn primary block" type="button" data-read>Check it</button>
      <p class="fine">Your photos go to the AI app you choose, under your account there and its own privacy rules. Stave doesn't send them anywhere; a photo you add here stays on this phone. Only scan music you're allowed to copy, such as your own exam book for your own practice.</p>
      ${scanAvailable() ? '<button class="btn block" type="button" data-server>Let Stave read it instead</button>' : ''}`);
    const copy = dlg.querySelector('[data-copy]');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(CHAT_PROMPT);
        copy.textContent = 'Copied';
      } catch {
        const box = dlg.querySelector('.scan-prompt');
        box.closest('details').open = true;
        box.select();
        copy.textContent = 'Select the message below and copy it';
      }
    });
    dlg.querySelector('#scan-files').addEventListener('change', async (e) => {
      photos = await Promise.all([...e.target.files].slice(0, MAX_PAGES).map(shrink)).catch(() => []);
      chat();
    });
    dlg.querySelector('[data-server]')?.addEventListener('click', pick);
    dlg.querySelector('[data-read]').addEventListener('click', () => {
      const text = scnFromReply(dlg.querySelector('#scan-reply').value);
      if (/^SCN1\s+NONE/.test(text)) return error("The AI app didn't see printed music in that photo. Try a sharper, flatter one.");
      let piece, xml;
      try {
        xml = scnToMusicXML(text);
        piece = normalize(parseMusicXML(xml, { id: 'scan-preview' }));
      } catch {
        return error(text ? "Part of that reply isn't in the right form. Copy the whole reply again, or ask the app to try again." : "That doesn't look like the reply. Copy the part that starts with SCN1.");
      }
      check(piece, xml, chat);
    });
  }

  function error(msg) {
    const el = dlg.querySelector('.error');
    el.textContent = msg;
    el.hidden = false;
  }

  async function read() {
    shell(`<p role="status">Reading your music. This usually takes under a minute.</p><div class="skeleton" aria-hidden="true"><i></i><i></i><i class="short"></i></div>`);
    let piece, xml;
    try {
      const { text } = await scanPages(photos.map(({ media_type, data }) => ({ media_type, data })));
      xml = scnToMusicXML(text);
      piece = normalize(parseMusicXML(xml, { id: 'scan-preview' }));
    } catch (e) {
      pick();
      return error(e.message?.startsWith('line ') || e.message === 'No notes found' ? "The music couldn't be read clearly. Try a sharper, flatter photo." : e.message);
    }
    check(piece, xml);
  }

  function check(piece, xml, back = pick) {
    shell(`
      <p class="warn-note">Check every bar against your ${photos.length ? 'photo' : 'printed copy'}. Scans can get notes wrong, and Stave marks your playing against what's here.</p>
      <div class="scan-compare">
        <figure ${photos.length ? '' : 'hidden'}><figcaption>Your photo${photos.length > 1 ? 's' : ''}</figcaption><div class="scan-photos" tabindex="0" role="group" aria-label="Your photos">${photos.map((p, i) => `<img src="${p.url}" alt="Page ${i + 1} as photographed">`).join('')}</div></figure>
        <figure><figcaption>What Stave read</figcaption><div class="score-scroll paper page scan-score" tabindex="0" role="img" aria-label="The scanned score: ${timeline(piece).length} notes in ${esc(piece.title)}"></div></figure>
      </div>
      <label class="field">Title <input id="scan-name" type="text" maxlength="120" value="${esc(piece.title === 'Untitled' ? '' : piece.title)}" placeholder="e.g. Minuet in G"></label>
      <div class="row gap wrap">
        <button class="btn" type="button" data-listen>Listen</button>
        <button class="btn" type="button" data-retake>${back === pick ? 'Retake' : 'Try again'}</button>
        <button class="btn primary" type="button" data-add>Looks right, add it</button>
      </div>`);
    const box = dlg.querySelector('.scan-score');
    box.replaceChildren(...renderScore(piece, { mode: 'page', width: box.clientWidth || 520 }).systems.map((s) => s.svg));
    dlg.querySelector('[data-listen]').addEventListener('click', () => {
      const t0 = audio().currentTime + 0.15;
      for (const n of expressivePlan(piece, piece.targetBpm || 80).filter((x) => x.at < 30)) scheduleNote(n.midi, t0 + n.at, n.dur, n.vel);
    });
    dlg.querySelector('[data-retake]').addEventListener('click', () => { photos = []; back(); });
    dlg.querySelector('[data-add]').addEventListener('click', () => {
      const title = dlg.querySelector('#scan-name').value.trim() || 'Scanned piece';
      dlg.close();
      onAdd(xml.replace(/<work-title>[\s\S]*?<\/work-title>/, `<work-title>${esc(title)}</work-title>`), title);
    });
  }

  if (scanAvailable()) pick(); else chat();
  dlg.showModal();
}
