# Changelog

Known-good versions of `main`. Each one gets a git tag and a GitHub release.

## v0.4.0: Foundation (2026-11-17)

**What's in it**
- **Your exact car:** add it by VIN (NHTSA decode) or by hand. Stores year, make, model, trim, VIN, body style, paint color and factory specs.
- **Build tracking:** done and planned mods in one list, "mark as installed", totals, photos, and a build timeline written by the database.
- **Security:** row-level security on every table, photos follow their car's privacy, input limits, AI advisor limited to 10 requests per user per hour.
- **Data layer:** one module for all database access, with plain-language errors. Build summaries and paged Discover.
- **3D groundwork (Option B):** a model catalog with exact models for popular cars and body-style models in the car's paint color, plus a storage bucket for model files.
- **Reliability:** schema as code (6 migrations), 76 database rule tests and 66 app tests in CI, a daily keep-alive and `/api/health`.

**Known gaps:** the AI advisor needs `GEMINI_API_KEY` in Vercel, the 3D model files aren't uploaded yet, and database backups are Phase 5.
