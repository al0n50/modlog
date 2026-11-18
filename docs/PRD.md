# ModLog: MVP PRD

Approved by Alonso on 2026-11-18. Living copy: the "ModLog: MVP PRD" doc. This file is the
version the code is built against.

## Summary

The MVP lets a car person add their exact car, show it off with a photo, log the mods done and planned on
it, and share the build with one link.

- **Who:** enthusiasts who modify their cars and track builds today in notes, spreadsheets and
  Instagram posts.
- **Problem:** a build's history and plans are scattered. Nothing shows the car as it is now plus
  what's coming next.
- **Success metric:** active builds, meaning builds with a mod added or updated in the last
  30 days. Target: 20 active builds 60 days after launch. Measured from the database, so no
  analytics tools are needed.

## Baseline: live today (v0.4.0)

| Area | What works |
| --- | --- |
| Exact car | Add by VIN (NHTSA decode) or by hand: year, make, model, trim, body style, paint color, factory specs |
| Build log | Done and planned mods, "mark as installed", totals, photos, timeline written by the database |
| Privacy | Builds private by default; database rules on every table; 76 database + 66 app tests |
| Social | Discover feed, profiles, reactions (basic) |
| 3D groundwork | Model catalog and storage ready (Option B); on hold until licensed models exist |
| AI advisor | Built; off until the Gemini key is added |

## MVP features, in build order

We build one feature at a time. Each ships on its own and gets a tagged release.

1. **Photo showcase: your car, front and center** (size S–M, release v0.5.0)
   - *Changed 2026-11-18 (Alonso):* this replaced "3D garage". The low-detail 3D cars weren't good
     enough, so 3D waits until licensed models exist. Stock photos matched from the VIN wait for
     users and a budget (they need a paid, licensed image service, e.g. VinAudit or IMAGIN.studio;
     a VIN doesn't record paint color, so the photo would use the color the owner picks).
   - *Story:* as an owner, I add a photo of my car from my phone or computer and it's the first
     thing anyone sees on my build.
   - *Done when:* the owner can upload the showcase photo from any device; big phone photos are
     shrunk on the device so they upload fast and fit the limit; a car with no photo invites the
     owner to add one; any gallery photo can be made the cover, on phones too.
   - *Shipped:* PRs #17 (3D removed), #18 (upload + phone-friendly gallery), #19 (prompt fix).
   - *Kept for later (the original feature 1, "3D garage"):* the car in 3D in its paint color, spin
     and zoom, loads in under 3 seconds on a phone, photo fallback, and every model licensed and
     credited.
2. **Build map: mods on the car** (size M, release v0.6.0)
   - *Story:* as an owner, I see each done and planned mod marked on the part of the car it
     changes, and I can edit any mod.
   - *Done when:* each mod category maps to an area of the car; done and planned mods look
     different; tapping an area lists its mods; any mod can be edited (name, brand, price, date,
     notes, done or planned); the page shows money spent and planned budget.
3. **Shareable build page** (size S–M, release v0.7.0)
   - *Story:* as an owner, I share one link (on Instagram, for example) and anyone can view my
     public build without an account.
   - *Done when:* a public build opens logged out; private builds show "not found"; the link
     shows a preview card with the car's name and photo; visitors see a "Start your own build"
     sign-up prompt; nothing is editable.

**Why this order:** the car itself is what people come to show off, so its showcase comes first.
The build map makes the build useful every day. The share page brings in new users once there's
something worth
sharing.

## Scope, risks and decisions

**Not in the MVP:** a native phone app, search, comments and messages, a parts marketplace, more
AI features, 3D models (until licensed), stock photos from the VIN (until there's a budget).

**Risks:**

- *Photo storage:* photos are shrunk to 2000 px on the device, which keeps the free storage plan
  and page loads light.
- *Model licensing:* only free-to-use or clearly licensed models; the catalog requires a license
  and credit for every file.
- *Free plan limits:* sign-up emails only reach the project's team until an email sender is
  connected.

**Decisions (2026-11-18):**

- [x] The 3 features and their order are approved
- [x] Feature 1 is the photo showcase; 3D waits for licensed models (2026-11-18)
- [x] Stock photos from the VIN: not now; upload only until there are users and a budget (2026-11-18)
- [x] Success target: 20 active builds 60 days after launch
- [x] Merging: Claude merges each pull request after its review and checks pass
