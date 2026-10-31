// Emails a parent or carer a one-time link to approve an under-13's account.
// Deploy: supabase functions deploy parent-consent
// Secrets: supabase secrets set RESEND_API_KEY=... MAIL_FROM="Stave <hello@your-domain>" SITE_URL=https://manlikeneil123-glitch.github.io/Music-Helper/
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.)
const env = (k: string) => Deno.env.get(k) ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, error?: string) => new Response(JSON.stringify(error ? { message: error } : { ok: true }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, 'POST only.');
  const base = env('SUPABASE_URL');
  const service = env('SUPABASE_SERVICE_ROLE_KEY');
  // Who is asking: the child's own session.
  const who = await fetch(`${base}/auth/v1/user`, { headers: { apikey: service, Authorization: req.headers.get('Authorization') ?? '' } });
  if (!who.ok) return reply(401, 'Sign in first.');
  const user = await who.json();
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || email.length > 254) return reply(400, "That email address doesn't look right.");
  const issued = await fetch(`${base}/rest/v1/rpc/issue_parent_consent`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: user.id, p_email: email }),
  });
  const token = await issued.json();
  if (!issued.ok) return reply(400, token?.message ?? 'Could not send the email.');
  const link = `${env('SITE_URL')}consent.html#${token}`;
  const name = user.user_metadata?.username ?? 'your child';
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('MAIL_FROM'),
      to: email,
      subject: `Can @${name} use a Stave account?`,
      text: `Hello,\n\nSomeone under 13 made a Stave account called @${name} and gave this address for a parent or carer.\n\nStave is a piano practice app. An account stores their username, practice minutes, flashcard scores and check results, so they're backed up and their piano teacher can follow them. It never stores their name or email. Nothing is stored until you say yes.\n\nTo say yes or no, open this link within 7 days:\n${link}\n\nIf you do nothing, the account is deleted after 14 days. We've stored this email address only to send this message, and delete it when you answer.\n\nPrivacy policy: ${env('SITE_URL')}privacy.html\n`,
    }),
  });
  if (!sent.ok) return reply(502, "The email couldn't be sent. Try again later.");
  return reply(200);
});
