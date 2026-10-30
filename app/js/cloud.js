// Minimal Supabase client over fetch: password auth plus the REST/RPC calls the app
// makes. No SDK, so no build step and nothing to cache-bust.
import { SUPABASE_URL, SUPABASE_ANON_KEY, USERNAME_DOMAIN } from './config.js';

const SESSION = 'mh:auth'; // outside the synced prefix: a login never travels to another device
const USERNAME = /^[a-z0-9_]{3,20}$/;

export const cloudReady = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const usernameError = (name) =>
  USERNAME.test(name) ? '' : 'Usernames are 3–20 characters: lowercase letters, numbers and _.';
const emailOf = (username) => `${username}@${USERNAME_DOMAIN}`;

export class CloudError extends Error {}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION));
  } catch {
    return null;
  }
}

function keepSession(s) {
  try {
    if (s) localStorage.setItem(SESSION, JSON.stringify(s));
    else localStorage.removeItem(SESSION);
  } catch {
    // Private mode: signed in for this visit only.
  }
}

export const currentUser = () => readSession()?.user ?? null;

// Supabase's messages are written for developers; students get plain English.
function friendly(status, body) {
  const msg = `${body?.msg ?? body?.error_description ?? body?.message ?? ''}`;
  if (status === 429) return 'Too many tries from this network. Wait a few minutes and try again.';
  if (/already registered|already exists/i.test(msg)) return 'That username is taken. Try another.';
  if (/invalid login credentials/i.test(msg)) return 'Wrong username or password.';
  if (/password/i.test(msg) && /characters|weak|short/i.test(msg)) return 'Pick a longer password: at least 8 characters.';
  if (/database error saving new user/i.test(msg)) return 'That username is taken or not allowed. Try another.';
  if (/email/i.test(msg) && /invalid/i.test(msg)) return 'The server rejected the account address. (Setup: check USERNAME_DOMAIN in config.js.)';
  return msg || `The server said no (error ${status}).`;
}

async function call(path, { method = 'GET', body, token, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        // Only a signed-in user's token goes here: newer projects' publishable keys aren't JWTs.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new CloudError("Can't reach the server. Your progress is still saved on this phone.");
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new CloudError(friendly(res.status, data));
    err.status = res.status;
    throw err;
  }
  return data;
}

function adopt(data) {
  if (!data?.access_token) {
    throw new CloudError('Account made, but the server wants email confirmation. (Setup: turn off "Confirm email" in Supabase → Authentication → Sign In / Providers → Email.)');
  }
  const s = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    user: { id: data.user.id, username: data.user.user_metadata?.username, role: data.user.user_metadata?.role ?? 'student' },
  };
  keepSession(s);
  return s.user;
}

export async function signUp(username, password, role) {
  return adopt(await call('/auth/v1/signup', { method: 'POST', body: { email: emailOf(username), password, data: { username, role } } }));
}

export async function signIn(username, password) {
  return adopt(await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: emailOf(username), password } }));
}

export async function signOut() {
  const s = readSession();
  keepSession(null);
  if (s) await call('/auth/v1/logout', { method: 'POST', token: s.access_token }).catch(() => {});
}

/** Checks the current password by signing in with it, then sets the new one. */
export async function changePassword(current, next) {
  const s = readSession();
  if (!s) throw new CloudError('Not signed in.');
  try {
    await signIn(s.user.username, current);
  } catch (e) {
    if (e.status === 400) throw new CloudError("That isn't your current password.");
    throw e;
  }
  await call('/auth/v1/user', { method: 'PUT', body: { password: next }, token: await token() });
}

let refreshing = null;
/** A valid access token, refreshing it when it's about to expire. */
async function token() {
  const s = readSession();
  if (!s) throw new CloudError('Not signed in.');
  if (s.expires_at - Date.now() > 60_000) return s.access_token;
  refreshing ??= call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } })
    .then(adopt)
    .catch((e) => {
      // A refresh token the server rejects means this login is over; offline, keep it.
      if (e.status >= 400 && e.status < 500) keepSession(null);
      throw e;
    })
    .finally(() => (refreshing = null));
  await refreshing;
  return readSession().access_token;
}

export async function rest(path, opts = {}) {
  return call(`/rest/v1/${path}`, { ...opts, token: await token() });
}

export async function rpc(name, args = {}) {
  return call(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token: await token() });
}
