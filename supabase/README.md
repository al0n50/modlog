# ModLog database

The database schema lives here as code. Every change to tables, rules, or storage
is a new SQL file in `migrations/`, applied in filename order.

| Migration | What it does |
|---|---|
| `20261117180830_baseline.sql` | The schema as originally built by hand (8 tables, security rules, sign-up trigger, photo bucket). Idempotent, so it was registered against the existing production database. |
| `20261117180901_v1_data_model.sql` | v1 data model: exact car identity (`body_class`, `specs`), one `mods` table with `status` = `done` or `planned`, data rules (year, VIN format, price, categories, reactions), `updated_at`, and indexes on every link between tables. |
| `20261117180946_security_hardening.sql` | Locks down the sign-up function, replaces broad rules with explicit per-action rules, limits photo uploads to images up to 5 MB, and adds `ai_requests` for rate-limiting the AI Advisor. |
| `20261117183824_private_photo_listing.sql` | Photos follow their car's privacy: only the owner can list a private car's photos (before, anyone could list the whole bucket). |
| `20261117205936_build_data_layer.sql` | Phase 4: the database writes the build timeline (clients can't fake history), `vehicle_summaries` for feeds, paint `color` and `body_style` on cars, and the 3D model catalog (`car_models`, `car_model_for()`, `car-models` bucket) for Option B. |

Filenames match the versions recorded in production's migration history, so the repo and the live database stay in sync.

## Data model (v1)

```
auth.users ─┬─ profiles ─┬─ vehicles ─┬─ mods (status: done | planned, category = area of the car)
            │            │            ├─ build_events (timeline)
            │            │            ├─ vehicle_photos
            │            │            └─ reactions
            │            └─ follows
            └─ ai_requests (AI Advisor usage, for rate limiting)
```

`wishlist_items` is deprecated: planned mods now live in `mods` with `status = 'planned'`.
It is kept (empty) until its removal is approved.

## Testing

`scripts/db-test.sh` builds a fresh Postgres database, applies every migration,
re-applies the baseline to prove it is idempotent, and runs `tests/10_security_rules.sql`.
Those tests act as two signed-in users and a logged-out visitor and check that each
can only see and change what they should (37 checks). CI runs this on every push.

`tests/00_supabase_shim.sql` is a small stand-in for Supabase's `auth` and `storage`
schemas so the tests run on plain Postgres. It is for testing only.

```bash
# needs a local Postgres you can connect to with psql
PGHOST=localhost PGUSER=postgres scripts/db-test.sh
```

## Changing the schema

1. Add a new file: `migrations/<YYYYMMDDHHMMSS>_<what_it_does>.sql`. Never edit one that is already applied.
2. Add or update tests in `tests/`.
3. Run `scripts/db-test.sh` until it passes.
4. Apply it to production (Supabase dashboard SQL editor, `supabase db push`, or the Supabase MCP) only after CI is green.
