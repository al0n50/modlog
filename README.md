# Modlog — Vehicle Build Tracker for Car People

> Track your build, log your mods, discover other builds. For the people who actually turn wrenches.

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
[![CI](https://github.com/al0n50/modlog/actions/workflows/ci.yml/badge.svg)](https://github.com/al0n50/modlog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live:** [modlog.vercel.app](https://modlog.vercel.app) · **Roadmap:** [open issues](https://github.com/al0n50/modlog/issues)

---

## Overview

Modlog is a full-stack social platform for car enthusiasts — think Amazon Garage meets a build diary with a community feed. Add your vehicles, track every mod from wishlist to installed, build a visual timeline, and follow other builders to see what they're working on.

It's a React/Vite web app (installable as a PWA) backed by Supabase (auth, Postgres, storage) and Vercel serverless functions. The database schema, security rules, and their tests live in [`supabase/`](supabase/).

---

## Features

**Garage**
- Add and manage multiple vehicles with full build profiles
- Pull official vehicle data from the NHTSA database
- Mod wishlist → promote to installed with one tap
- Track spending per mod and totals per build

**Social & Discovery**
- Discover feed to explore other users' builds
- Follow other builders, react to their posts
- Public profiles with full mod history

**AI Advisor**
- Powered by Google Gemini
- Ask for mod recommendations, compatibility checks, and build advice per vehicle

**Media & Timeline**
- Photo gallery per vehicle
- Visual build timeline showing modification history in order

**Installable**
- PWA installable on Android/iOS from the browser
- Native mobile app planned on the same backend

---

## Stack

| Layer | Tech |
|---|---|
| Web Frontend | React 19 + Vite + Tailwind CSS v4 |
| State | Zustand |
| Animations | Framer Motion |
| Routing | React Router DOM v7 |
| Auth & Database | Supabase |
| Vehicle Data | NHTSA API |
| AI | Google Gemini |
| API | Vercel serverless functions (`client/api/`) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
modlog/
├── client/          # React + Vite web app
│   ├── src/pages/   # GaragePage, DiscoverPage, ProfilePage, SearchPage, AuthPage
│   ├── src/components/
│   │   ├── garage/  # VehicleCard, AddVehicleModal, AddModForm, AddWishForm
│   │   ├── mods/    # ModCategoryBadge, PromoteModModal, ReactionBar
│   │   ├── photos/  # PhotoGallery
│   │   ├── timeline/ # BuildTimeline
│   │   ├── social/  # FollowButton
│   │   ├── ai/      # AIAdvisor
│   │   └── ui/      # BottomNav, Skeleton
│   ├── src/lib/     # supabase.js, vehicles.js, gemini.js, nhtsa.js, storage.js
│   └── api/         # serverless functions: recommendations, health
├── supabase/        # migrations, security-rule tests
└── scripts/         # db-test.sh
```

---

## Getting Started

### Web App

```bash
cd client
npm install
cp .env.example .env.local   # fill in Supabase + Gemini keys
npx vercel dev               # runs Vite + the /api functions together
# (plain `npm run dev` works too, but the AI Advisor needs /api)
```

### Testing

```bash
cd client
npm test        # Vitest: NHTSA decoding, AI Advisor API + client, social helpers
npm run lint    # ESLint (React hooks rules)
npm run build   # production build
```

All three run in GitHub Actions on every push and pull request.

### Deploying (Vercel)

1. Import `al0n50/modlog` in Vercel and set **Root Directory** to `client` (framework: Vite).
2. Add environment variables:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — public, bundled into the browser
   - `GEMINI_API_KEY` — server-only, used by `api/recommendations.js`
3. Deploy, then add the Vercel URL to Supabase → Authentication → URL Configuration (Site URL + Redirect URLs).

The Gemini key never reaches the browser: the AI Advisor calls `/api/recommendations`, a serverless function that verifies the user's Supabase session before calling Gemini.

---

## Status

🚧 **In active development** — core garage, mod tracking, Supabase auth, and AI Advisor are functional. Next: the 3D garage and the shared data-access layer.

---

Built by [Alonso Ochoa](https://github.com/al0n50)

---

## License

[MIT](LICENSE) © 2026 Alonso Ochoa
