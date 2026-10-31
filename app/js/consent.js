// A parent or carer approves (or refuses) an under-13's account from the emailed link.
// The token is in the #hash so it never reaches server logs.
import { cloudReady, publicRpc } from './cloud.js';

const root = document.getElementById('consent');
const token = location.hash.slice(1);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const show = (html) => { root.innerHTML = `<h1>Approve an account</h1>${html}`; root.querySelector('h1').focus?.(); };

if (!cloudReady() || !/^[0-9a-f-]{36}$/.test(token)) {
  show('<p>This link isn\'t complete. Open it straight from the email, or ask your child to send a new one from their Account page.</p>');
} else {
  show(`
    <p class="lede">Your child made a Stave account and gave your email address so you can decide.</p>
    <h2>What Stave is</h2>
    <p>A free piano practice app. No adverts, no tracking, no chat with strangers, nothing public.</p>
    <h2>What an account stores</h2>
    <ul>
      <li>Their username, and the month and year they were born.</li>
      <li>Their practice: minutes, flashcard progress, check scores, exam plan.</li>
      <li>If they join their piano teacher's studio: the teacher sees a summary of that practice. Recordings they choose to send the teacher are deleted after 20 days.</li>
    </ul>
    <p>Never their name, email, school or location. Without an account the app still works fully; it just isn't backed up. Full details: <a href="privacy.html">Privacy</a> and <a href="terms.html">Terms</a>.</p>
    <p class="error" id="c-error" role="alert" hidden></p>
    <div class="row gap wrap">
      <button class="btn primary" type="button" data-agree="1">I'm their parent or carer, and I agree</button>
      <button class="btn bad" type="button" data-agree="0">Don't allow it (delete the account)</button>
    </div>
    <p class="fine">You can ask us to delete the account later at any time, and your child can delete it from their Account page.</p>`);
  root.querySelectorAll('[data-agree]').forEach((b) => b.addEventListener('click', async () => {
    const agree = b.dataset.agree === '1';
    root.querySelectorAll('button').forEach((x) => (x.disabled = true));
    try {
      const name = await publicRpc('parent_consent', { p_token: token, p_agree: agree });
      show(agree
        ? `<p class="lede">Thank you. @${esc(name)}'s account is approved and will start backing up their practice.</p><p>We've deleted your email address. You can close this page.</p>`
        : `<p class="lede">Done. @${esc(name)}'s account has been deleted.</p><p>They can still use Stave on their phone without an account; nothing leaves the device. We've deleted your email address.</p>`);
    } catch (e) {
      const el = root.querySelector('#c-error');
      el.textContent = e.message;
      el.hidden = false;
      root.querySelectorAll('button').forEach((x) => (x.disabled = false));
    }
  }));
}
