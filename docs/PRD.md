# ModLog: MVP PRD

Approved by Alonso on 2026-11-18. Living copy: the "ModLog: MVP PRD" doc. This file is the
version the code is built against.

## Summary

The MVP lets a car person add their exact car, see it in 3D, log the mods done and planned on
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
| 3D groundwork | Model catalog and storage ready (Option B); no 3D viewer yet |
| AI advisor | Built; off until the Gemini key is added |

## MVP features, in build order

We build one feature at a time. Each ships on its own and gets a tagged release.

1. **3D garage: your exact car, in 3D** (size M, release v0.5.0)
   - *Story:* as an owner, I open my build and see a 3D model of my car in its paint color that
     I can spin and zoom.
   - *Done when:* the model loads on the build page in under 3 seconds on a phone; an exact model
     is shown when the catalog has one, otherwise the body-style model in the car's paint color;
     drag to rotate, pinch or scroll to zoom; the cover photo shows if 3D isn't supported; every
     model has a clear license and credit.
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

**Why this order:** the 3D car is what makes ModLog different, so it comes first. The build map
makes the 3D useful every day. The share page brings in new users once there's something worth
sharing.

## Scope, risks and decisions

**Not in the MVP:** a native phone app, search, comments and messages, a parts marketplace, more
AI features, exact 3D models beyond a few popular cars.

**Risks:**

- *3D on older phones:* small, low-detail models, loaded only on the build page.
- *Model licensing:* only free-to-use or clearly licensed models; the catalog requires a license
  and credit for every file.
- *Free plan limits:* sign-up emails only reach the project's team until an email sender is
  connected.

**Decisions (2026-11-18):**

- [x] The 3 features and their order are approved
- [x] 3D source: start with free, low-detail body-style models, then add exact models for popular cars
- [x] Success target: 20 active builds 60 days after launch
- [x] Merging: Claude merges each pull request after its review and checks pass
