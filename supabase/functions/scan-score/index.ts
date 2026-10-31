// Photo of printed music → SCN1 text (app/js/scnformat.js turns it into MusicXML).
// Deploy: supabase functions deploy scan-score
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... SCAN_MONTHLY_PAGES=3000 SCAN_DAILY_PAGES=6
// Off in the app until SCAN_ENABLED in app/js/config.js is true (after tools/scan-eval.mjs passes).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { SCAN_MODEL, SCAN_SYSTEM, SCAN_ASK, MAX_PAGES } from '../_shared/scan-prompt.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => reply(status, { message });
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return fail(405, 'POST only.');
  const base = env('SUPABASE_URL');
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  const who = await fetch(`${base}/auth/v1/user`, { headers: { apikey: service, Authorization: req.headers.get('Authorization') ?? '' } });
  if (!who.ok) return fail(401, 'Sign in first.');
  const user = await who.json();

  const { images } = await req.json().catch(() => ({}));
  if (!Array.isArray(images) || !images.length || images.length > MAX_PAGES) return fail(400, `Send 1 to ${MAX_PAGES} photos.`);
  for (const im of images) {
    if (!TYPES.has(im?.media_type) || typeof im?.data !== 'string' || im.data.length > 3_000_000 || !/^[A-Za-z0-9+/=]+$/.test(im.data)) return fail(400, "One of the photos couldn't be read. Try taking it again.");
  }

  // Daily per-student and monthly overall limits, and under-13 approval, checked in the database.
  const claim = await fetch(`${base}/rest/v1/rpc/claim_scan`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: user.id, p_pages: images.length, p_daily: Number(env('SCAN_DAILY_PAGES') || 6), p_monthly: Number(env('SCAN_MONTHLY_PAGES') || 3000) }),
  });
  if (!claim.ok) return fail(429, (await claim.json().catch(() => ({})))?.message ?? 'Scanning is busy. Try again later.');

  try {
    const msg = await client.messages.create({
      model: SCAN_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: SCAN_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          ...images.map((im: { media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: im.media_type, data: im.data } })),
          { type: 'text' as const, text: SCAN_ASK },
        ],
      }],
    });
    if (msg.stop_reason === 'refusal') return fail(422, "That photo couldn't be read as music.");
    if (msg.stop_reason === 'max_tokens') return fail(422, 'That was too much music in one go. Scan one page at a time.');
    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
    const at = text.indexOf('SCN1');
    if (at < 0 || /^SCN1 NONE/.test(text.slice(at))) return fail(422, "That doesn't look like printed music. Try a flat, well-lit photo of the whole page.");
    return reply(200, { text: text.slice(at, at + 200_000) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail(429, 'Scanning is busy. Try again in a minute.');
    if (e instanceof Anthropic.APIError) return fail(502, 'The scanner is having trouble. Try again later.');
    throw e;
  }
});
