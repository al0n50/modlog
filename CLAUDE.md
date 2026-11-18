# ModLog: project brief

Read this first. It's the working context for anyone (or any AI agent) changing this repo:
what ModLog is, how it fits together, how to run it, and the rules that keep it stable.

## What it is

A garage for car people: add your **exact car**, log the **mods you've done**, plan the
**mods you want**, and (next) see the build on a **3D model of your car**.
Owner: Alonso Ochoa (@al0n50). Live: https://modlog.vercel.app

v1 scope: exact car (VIN or manual) → done mods → planned mods → photos/timeline → 3D garage.
Social, search and the mobile app come after v1.

## The foundation (status)

| Fundamental | How it works here | Status |
|---|---|---|
| **Frontend & backend** | React 19 + Vite SPA (`client/src`) in the browser. Backend = Supabase (Postgres, Auth, Storage) + Vercel serverless functions (`client/api`). | ✅ |
| **Repo** | One repo, `main` is production. README, MIT license, CI, secret scanning + push protection on. | ✅ (branch protection: decision pending) |
| **Commit** | Small, single-purpose commits; message rules below; CI must pass. | ✅ |
| **Auth** | Supabase email + password. Every table has row-level security; the database decides who can read/write, not the UI. | ✅ (leaked-password check: off, Supabase dashboard) |
| **Context window** | This file + `supabase/README.md`. Update both when the architecture or rules change. | ✅ |
| **Localhost & deploy** | `npm run dev` in `client/`. Push to `main` → GitHub Actions CI + Vercel deploys automatically. | ✅ (local dev uses the production database: separate dev database pending) |
| **Database** | Schema as code in `supabase/migrations`, 76 rule tests in `supabase/tests`, run in CI. | ✅ (backups: Phase 5) |
| **API & API keys** | `/api/recommendations` (Gemini, server-only key, 10 requests/user/hour), `/api/health`. NHTSA VIN decoding needs no key. Supabase publishable key is public by design. | ✅ (Gemini key: not set in Vercel yet) |
| **Checkpoint** | Tagged releases (`vX.Y.Z`) mark known-good versions; rollback steps below. | ✅ |

## Architecture

```
Browser (client/src) ──► Supabase  (Postgres + RLS, Auth, Storage: vehicle-photos, car-models)
      │
      └──────────────► Vercel functions (client/api)
                          ├─ recommendations.js ─► Gemini   (key: GEMINI_API_KEY, server-only)
                          └─ health.js          ─► Supabase (daily cron keeps the free DB awake)
Browser ─────────────► NHTSA vPIC (VIN decoding, public, no key)
```

- `client/src/lib/db/`: **the only module that queries the database.** Screens, stores and
  hooks call it; every failure is a `DataError` with a message safe to show (`errors.js`).
- `client/src/store/`: Zustand stores (`useAuthStore`, `useGarageStore`).
- `client/src/lib/vehicles.js`: form ↔ row mapping, VIN rules, makes, body styles, cover fallback.
- `client/src/lib/storage.js`: photo upload/list/delete (owner's folder: `<user id>/<car id>/`).

### Data model (see `supabase/README.md`)
- `vehicles`: exact car (year, make, model, trim, VIN, body class/style, paint `color`, `specs`), `is_public`
- `mods`: one table; `status` = `done` | `planned`; category = the car area
- `build_events`: timeline, **written by a database trigger**. Clients cannot insert.
- `vehicle_summaries` (view): counts, totals, latest mods, owner, for feeds
- `car_models` + `car_model_for(vehicle_id)`: 3D catalog (Option B: exact model for popular
  cars, body-style model in the car's paint color for the rest)
- `ai_requests`: AI usage log for rate limiting
- Legacy, unused: `wishlist_items`, `vehicle_photos` (dropping them is pending a decision)

## Run it locally

```bash
cd client
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm ci
npm run dev                  # http://localhost:5173
npm test                     # Vitest (66 tests)
npm run lint && npm run build
```
⚠️ Until a separate dev database exists, `.env.local` points at **production**. Use a test car
and delete it after.

Database tests (needs a local Postgres 15+ with a `postgres` superuser):
```bash
PGHOST=/tmp PGPORT=55432 PGUSER=postgres scripts/db-test.sh
```

## Deploy

- Push/merge to `main` → CI (`.github/workflows/ci.yml`: app tests, lint, build, database tests)
  → Vercel builds `client/` and deploys to modlog.vercel.app.
- The app is a PWA: the first visit after a deploy may load the previous version, then it updates.
- Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`
  (optional `GEMINI_MODEL`, `AI_HOURLY_LIMIT`). New env vars only apply after a redeploy.

## Changing the database

1. Add `supabase/migrations/<timestamp>_<name>.sql`, written to be safe to re-run.
2. Add or extend tests in `supabase/tests/` (act as real roles: `anon`, `authenticated`).
3. Run `scripts/db-test.sh` locally; CI runs it too.
4. Apply to production (`supabase db push`, or the dashboard SQL editor), **then rename the file
   so its timestamp matches the version recorded in production's migration history**.
5. Never edit a migration that's already applied. Fix forward with a new one.

## Rules

- Security lives in the database (RLS, constraints, triggers). The UI hiding a button is not security.
- Secrets never go in code or `VITE_*` variables. Only the Supabase URL and publishable key are public.
- Owner-only UI checks `user.id === car.user_id`; visitors get a read-only build page.
- Test before shipping; check the live site after deploying.
- Product decisions (scope, 3D sources, dropping tables, paid services) go to Alonso.
- Repo rules: one repo per project; never delete existing repos; no duplicate repos or clones.

## Commits

- Summary line: imperative, ≤ 72 characters, says what changed ("Fix sign-in redirect on page load").
- Body: why, and what was found or tested. Note anything applied to production.
- One logical change per commit. CI green before merging to `main`.

## Checkpoints & rollback

- **Code:** each known-good state of `main` is tagged `vX.Y.Z` with a GitHub release.
  Undo a bad change with `git revert <sha>` and push. Never force-push `main`.
- **Deploy:** Vercel → Deployments → pick the last good one → **Instant Rollback**.
- **Database:** migrations are forward-only. Undo with a new migration. Data backups: Phase 5.

## Roadmap

Phases 1–4 done (schema as code, data model, security, data layer). Next: **Phase 5:
reliability** (backups/export, error monitoring), then **Phase 6: features** (3D garage viewer,
demo garage, search, mobile). Plan lives on the project whiteboard.
