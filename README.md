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

## Data
`store.js` holds the data layer. The current `LocalStore` keeps data in the browser only (for testing). A shared hosted backend plugs in behind the same methods.
