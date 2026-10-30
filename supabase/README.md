# Turning accounts on (about 5 minutes)

Accounts are username + password with no email, student and teacher roles, and a
studio code students use to join their teacher. Until this is done the app works
fully on-device and the Account page says accounts aren't switched on yet.

1. **Create a project** at [supabase.com](https://supabase.com) → New project. Region:
   *West Europe (London)*, so UK students' data stays in the UK/EU.
2. **Run the migrations.** Project → SQL Editor → New query → paste each file in
   [`migrations/`](migrations) **in number order** (`0001_initial.sql`, then `0002_…`)
   → Run. Each is safe to run again. Then run [`audit.sql`](audit.sql) and check the
   results match the comments in it.
3. **Turn off email confirmation.** Authentication → Sign In / Providers → Email →
   switch off *Confirm email* → Save. (Leave the Email provider itself on: usernames
   are stored as `username@manlikeneil123-glitch.github.io`, an address that can never
   receive mail.)
4. **Set the minimum password length** to 8 on the same page, to match the app.
5. **Copy the keys.** Project Settings → API Keys → copy the *Project URL* and the
   *publishable* key (or the *anon* key on older projects) into
   [`app/js/config.js`](../app/js/config.js). Both are safe to publish; the
   row-level security in the migrations is what protects each account.
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
enable *pg_cron* first, then re-run `0001_initial.sql`, so the job gets created).

## Limits to know about

- **Free plan:** 50,000 monthly active users *per project*, 500 MB database. A free
  project **pauses after a week with no activity**: data is kept, but sign-in fails
  until you press *Restore* in the dashboard. Real use keeps it awake; before launch,
  move to Pro (about $25/month) so it never pauses.
- **Forgotten passwords can't be reset by the student** (there's no email). You can
  set a new one in SQL Editor:
  `update auth.users set encrypted_password = extensions.crypt('new-password-here', extensions.gen_salt('bf')) where email = 'ana@manlikeneil123-glitch.github.io';`
  Teachers can also set a temporary password for their own students from the Account page.
- **Sign-up rate limits:** Supabase limits sign-ups per IP address. A whole class
  signing up on one school Wi-Fi in the same few minutes may hit it; spread it out or
  raise the limit in Authentication → Rate Limits.
- **Anyone can pick "Teacher".** A teacher only ever sees students who chose to join
  with their code, and there's no messaging, but verify teachers before a public launch.

## Testing the rules

`sh tests/db/run.sh` builds a throwaway Postgres, runs every migration twice and checks
the security rules (nobody reads another student's progress, codes are required to
join, deleted accounts take their data with them, and so on). CI runs it on every push.

## Changing the database

Never edit a migration that has already been run. Add the next numbered file
(`0003_what_it_does.sql`), written so it's safe to run twice (`if not exists`,
`create or replace`, `drop … if exists` before re-adding). **Run it in Supabase before
pushing app code that needs it**, then run `audit.sql` again.

## Backups

The free plan has no backups. `tools/backup.sh` dumps the database (all public tables
and the auth users), encrypts it, and keeps the last 8 copies. The weekly GitHub
workflow `.github/workflows/backup.yml` runs it once you add two repository secrets
(GitHub → the repository → Settings → Secrets and variables → Actions → New secret):

1. `SUPABASE_DB_URL`: Supabase → Project Settings → Database → Connection string →
   *URI* (session pooler), with your database password filled in.
2. `BACKUP_PASSPHRASE`: a long random passphrase. Keep a copy somewhere safe (a
   password manager): without it the backups can't be opened.

Backups are encrypted before upload because workflow files in a public repository can
be downloaded by other GitHub users. Test a restore once: download a backup from the
workflow run, then `gpg -d stave-*.sql.gz.gpg | gunzip | psql <a scratch database>`.

## Not done yet

- **Captcha on sign-up and sign-in** (owner decision: later). Before accounts are
  opened to the public, turn on Authentication → Bot and Abuse Protection with
  Cloudflare Turnstile, and add the site key to the app.
