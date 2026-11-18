# Good Wood Weight Loss Challenge

Mobile-first web app (installable to the home screen) for the group weight challenge starting **Nov 30, 2026**.

- **Me:** weekly weigh-in, your % and lbs change, rank, weight chart, history, change PIN
- **Board:** weekly and overall leaderboards, separate Lose and Gain tracks, ranked by % change
- **Group:** total lbs, average %, who still needs to weigh in, group trend chart
- **Shouts:** automatic weekly highlights (biggest loser, top gainer, milestones, perfect attendance) plus kudos with reactions
- **Commissioner:** passcode-gated admin to add people, set tracks, reset PINs, fix any weigh-in, delete shouts, export/import backups

Raw weights are only visible to the person and the commissioner; everyone else sees % and lbs changed.

## Settings
Edit `config.js` (start date, number of weeks, milestones).

## Run locally
`python3 -m http.server` then open http://localhost:8000. Add `?today=2026-12-21` to the URL to preview a later week.

## Shared database (Supabase)
1. Create a free project at supabase.com.
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
3. Settings → API: copy the Project URL and the anon/publishable key into `config.js`, and set `backend: "supabase"`.
4. Open the app, tap **Commissioner**, set the passcode, and add everyone with a PIN.

Tables are locked (row-level security, no direct access). The app only calls Postgres functions that check the person's PIN or the commissioner passcode. PINs and the passcode are stored hashed.

With `backend: "local"` data stays in one browser, which is handy for trying things out (Commissioner → Load demo data).
