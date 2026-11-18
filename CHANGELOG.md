# Changelog

Known-good versions of `main`. Each one gets a git tag and a GitHub release.

## v0.5.0: Photo showcase (2026-11-18)

**What's in it**
- **Your car's photo is the showcase:** upload it from your phone or computer on the build page ("📷 Change photo"), or pick any gallery photo as the cover. A car with no photo asks its owner to add one.
- **Phone photos just work:** photos are shrunk on the device to 2000 px JPEG before upload, so big phone photos fit the 5 MB limit and pages load fast (a 17 MB photo became 276 KB in testing).
- **Gallery on phones:** "Cover" and delete are reachable on touch screens, and the current cover is marked.
- **3D garage removed:** the low-detail 3D cars (#16) were reverted (#17). 3D waits for licensed models.

**Known gaps:** stock photos matched from the VIN wait for a paid image service (Alonso's call). The AI advisor still needs `GEMINI_API_KEY` in Vercel.

## v0.4.0: Foundation (2026-11-17)

**What's in it**
- **Your exact car:** add it by VIN (NHTSA decode) or by hand. Stores year, make, model, trim, VIN, body style, paint color and factory specs.
- **Build tracking:** done and planned mods in one list, "mark as installed", totals, photos, and a build timeline written by the database.
- **Security:** row-level security on every table, photos follow their car's privacy, input limits, AI advisor limited to 10 requests per user per hour.
- **Data layer:** one module for all database access, with plain-language errors. Build summaries and paged Discover.
- **3D groundwork (Option B):** a model catalog with exact models for popular cars and body-style models in the car's paint color, plus a storage bucket for model files.
- **Reliability:** schema as code (6 migrations), 76 database rule tests and 66 app tests in CI, a daily keep-alive and `/api/health`.

**Known gaps:** the AI advisor needs `GEMINI_API_KEY` in Vercel, the 3D model files aren't uploaded yet, and database backups are Phase 5.
