# Turning accounts on (about 5 minutes)

Accounts are username + password with no email, student and teacher roles, and a
studio code students use to join their teacher. Until this is done the app works
fully on-device and the Account page says accounts aren't switched on yet.

1. **Create a project** at [supabase.com](https://supabase.com) → New project. Region:
   *West Europe (London)*, so UK students' data stays in the UK/EU.
2. **Run the schema.** Project → SQL Editor → New query → paste all of
   [`schema.sql`](schema.sql) → Run. It's safe to run again after updates.
3. **Turn off email confirmation.** Authentication → Sign In / Providers → Email →
   switch off *Confirm email* → Save. (Leave the Email provider itself on: usernames
   are stored as `username@manlikeneil123-glitch.github.io`, an address that can never
   receive mail.)
4. **Set the minimum password length** to 8 on the same page, to match the app.
5. **Copy the keys.** Project Settings → API Keys → copy the *Project URL* and the
   *publishable* key (or the *anon* key on older projects) into
   [`app/js/config.js`](../app/js/config.js). Both are safe to publish; the
   row-level security in `schema.sql` is what protects each account.
6. Commit and push. GitHub Pages redeploys in about a minute.

**Never use the `service_role` / secret key in the app.** It bypasses all security.

## What's stored

| Table | What | Who can read it |
|---|---|---|
| `profiles` | username, role (student/teacher), studio joined | you; your teacher; your students |
| `studios` | a teacher's studio name and join code | the teacher; its students (not the code) |
| `progress` | the app's saved progress (sessions, checks, flashcards, setup, imported pieces) plus a small summary | you; your teacher (via the summary) |

No names, emails, recordings or device details. Mic tuning and recordings never
leave the phone.

Teaching tables (same rules: each studio only ever sees its own):

| Table | What | Who can read it |
|---|---|---|
| `assignments` | work a teacher sets (piece, bars, tempo, due date, note) | the teacher; the student it's for (or the whole studio) |
| `shared_scores` | MusicXML a teacher shares | the teacher and their students |
| `recordings` | takes a student chose to send (compressed audio, or the notes played on a keyboard) | the student and their teacher, for **20 days** |
| `parent_links` | a secret token per student | nobody directly; `parent_view(token)` returns that student's summary only |

**Recordings are deleted after 20 days.** They're hidden by the security rules the
moment they're older than that, deleted whenever anyone sends a new one, and on
Supabase the schema also schedules a nightly `pg_cron` job (Database → Extensions →
enable *pg_cron* first, then re-run `schema.sql`, so the job gets created).

## Limits to know about

- **Free plan:** 50,000 monthly active users *per project*, 500 MB database. A free
  project **pauses after a week with no activity**: data is kept, but sign-in fails
  until you press *Restore* in the dashboard. Real use keeps it awake; before launch,
  move to Pro (about $25/month) so it never pauses.
- **Forgotten passwords can't be reset by the student** (there's no email). You can
  set a new one in SQL Editor:
  `update auth.users set encrypted_password = extensions.crypt('new-password-here', extensions.gen_salt('bf')) where email = 'ana@manlikeneil123-glitch.github.io';`
  A teacher-reset button is on the shortlist.
- **Sign-up rate limits:** Supabase limits sign-ups per IP address. A whole class
  signing up on one school Wi-Fi in the same few minutes may hit it; spread it out or
  raise the limit in Authentication → Rate Limits.
- **Anyone can pick "Teacher".** A teacher only ever sees students who chose to join
  with their code, and there's no messaging, but verify teachers before a public launch.

## Testing the rules

`sh tests/db/run.sh` builds a throwaway Postgres, runs `schema.sql` twice and checks
35 security rules (nobody reads another student's progress, codes are required to
join, deleted accounts take their data with them, and so on). CI runs it on every push.
