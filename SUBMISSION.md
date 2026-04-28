# Moodle submission — quick guide for markers

This document is for academic assessors inspecting the zipped source code.

## What you have

A complete Expo Router + TypeScript codebase for **Life Balance Assistant
(LBA)**, the dissertation prototype. The repository contains the mobile app,
the Node backend, unit tests, study protocol, and supporting documentation.
Secrets (`.env`, `backend/.env`) are intentionally excluded from the zip; see
`.env.example` files for the required variables.

## What you do **not** need

- An Apple Developer account
- A WHOOP device or WHOOP credentials
- My personal laptop or any private credentials
- The deployed backend (the app degrades gracefully if it's unreachable)

The prototype provides **two demo paths** so every WHOOP-dependent claim
in the dissertation can be evaluated without a live WHOOP account:

1. **Seed 30-day demo dataset** under **Profile → Settings → Demo Tools** —
   populates a full month of check-ins, wearable data, and computed LBI
   scores. Best for evaluating insights, correlations, and trends.
2. **Use 7-day demo WHOOP data** under **Profile → Integrations → WHOOP** —
   seeds realistic WHOOP-shaped recovery / sleep / strain through the
   exact same wearable pipeline the live OAuth sync uses, and labels every
   day in the UI and in exports as **WHOOP (demo)**. Best for evaluating
   the WHOOP-dependent code path itself (`lib/whoopSync.ts`,
   `lib/transparency.ts`, `lib/pipeline.ts`) without WHOOP credentials.

The real WHOOP OAuth path (`backend/whoop.ts`,
`app/(tabs)/profile/integrations/whoop.tsx`) is **unchanged** and remains
the production integration used in the dissertation viva and the pilot
study. The demo path is additive — it is never used to fake live data.

## Recommended inspection routes

### Route 1 — Read the code (no install)

The most important files for the dissertation argument:

| Concern | File |
|---|---|
| LBI scoring pipeline | `lib/pipeline.ts`, `lib/lbi.ts` |
| Mind-Body Bridge (H8 novelty) | `lib/bridge.ts` |
| Hypotheses H1–H8 | `docs/Hypotheses.md` |
| Operationalisation table | `docs/Operationalisation.md` |
| Data-flow diagram | `docs/DataFlow.md` |
| Study protocol | `docs/StudyProtocol.md` |
| Threats to validity | `docs/ThreatsToValidity.md` |
| Privacy / consent / retention | `lib/privacy.ts`, `app/(tabs)/profile/settings/` |
| Backend (WHOOP OAuth + LLM) | `backend/server.ts`, `backend/whoop.ts`, `backend/api/explain.ts` |
| ML recommender (H7) | `lib/ml/recommender.ts`, `lib/ml/recommenderCore.ts` |
| Unit tests (12 suites) | `tests/*.test.ts` |

### Route 2 — Run unit tests (no device needed)

Requires Node 20+.

```bash
npm install
npm test
```

This runs all unit-test suites: privacy, retention, baseline, analytics,
ML evaluation, plan adherence, transparency, counterfactual, viva-smoke, etc.
Each suite is a stand-alone TypeScript file under `tests/`.

You can also run TypeScript type-checking:

```bash
npx tsc --noEmit
```

### Route 3 — Run the app via Expo Go (full UI, no build required)

Requires Node 20+, npm, and the **Expo Go** app on your phone (free, App
Store / Play Store), or an iOS / Android simulator.

```bash
npm install
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

- No `.env` configuration is needed for this route.
- No backend is needed: open **Profile → Settings → Demo Tools → Seed
  30-day demo dataset** and the entire app becomes navigable with
  realistic data.
- The LLM reflection feature falls back to deterministic local templates
  when the backend is unreachable (see `lib/llm.ts`), so the UI never
  appears broken.

### Route 4 — Install the pilot build

A separate install link (EAS internal distribution) is provided in the
dissertation appendix. This routes through the deployed backend at
`https://life-balance-assistant.onrender.com` for WHOOP OAuth and LLM
reflections; the rest of the app works fully on-device.

## What was excluded from the zip and why

| Excluded | Reason |
|---|---|
| `node_modules/`, `backend/node_modules/` | ~550 MB of restorable dependencies — `npm install` recreates them |
| `dist/`, `.expo/`, `backend/dist/` | Build artefacts; regenerated on demand |
| `.env`, `backend/.env` | Real secrets (WHOOP_CLIENT_SECRET, OPENAI_API_KEY) — see `.env.example` for the required keys |
| `backend/.data/` | Server-side WHOOP token store; not present in the source distribution |
| `review_bundle/` | Local snapshot directory; not part of the project |

## Feature dependencies on external services

| Feature | Depends on | Behaviour without it |
|---|---|---|
| Daily check-in, LBI, plan, history, ML risk, exports, ethics screens | Nothing | Fully functional |
| WHOOP sync | Backend + WHOOP credentials | Disabled with a clear message; manual entry available under Profile → Integrations → WHOOP |
| LLM-powered reflection on the emotion screen | Backend + `OPENAI_API_KEY` | Falls back to deterministic local template; UI shows "offline reflection" badge |

## Honesty statement

The deployed backend is a free Render web service and may **cold-start**
(~30 s on first request after idle). The mobile app handles this with a
30 s timeout and a "Backend is waking up" message; subsequent requests
respond in under a second. None of the core dissertation features depend
on the backend being reachable.
