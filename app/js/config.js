// Server settings. Leave SUPABASE_URL empty and the app runs fully on-device, with
// accounts shown as "not set up yet". See supabase/README.md for the five-minute setup.
export const SUPABASE_URL = '';
// The public key from Supabase → Project Settings → API Keys: the "publishable" key
// (sb_publishable_…) or, on older projects, the "anon" key. It is meant to be
// public: what each account can read is enforced by row-level security on the server.
export const SUPABASE_ANON_KEY = '';

// Accounts are username + password, no email. Supabase still wants an address, so a
// username is stored as username@USERNAME_DOMAIN. This must be a domain you control
// that can't receive mail (your GitHub Pages host is ideal). Never change it after
// launch: every existing account's sign-in depends on it.
export const USERNAME_DOMAIN = 'manlikeneil123-glitch.github.io';
