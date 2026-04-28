# Life Balance Assistant (LBA)

Expo Router + TypeScript mobile app with an optional Node backend for WHOOP OAuth/token handling and optional LLM narrative reflection.

> **For dissertation markers / academic assessors:** see [Examiner quick start](#examiner-quick-start) below. You do **not** need WHOOP credentials, an Apple ID, or my laptop to evaluate this prototype — a 30-day demo dataset is built in.
>
> **For pilot testers:** see [Pilot install](#pilot-install) below. The deployed backend is at `https://life-balance-assistant.onrender.com` and is already wired into the EAS build.

## Architecture

- Mobile app: `app/`, `components/`, `lib/`
- Backend: `backend/server.ts`, `backend/whoop.ts`, `backend/api/explain.ts`
- Storage:
  - Device: AsyncStorage (`lib/storage.ts`)
  - WHOOP tokens/cache: `backend/.data/*.json` (server-side only)

## Core features

- Daily check-in pipeline -> LBI -> explainability/trends/correlations/ML
- WHOOP OAuth + sync (client secret never in app)
- Consent gating and privacy controls
- Retention policy with purge
- Export pack with anonymisation/redaction options
- Plan adherence tracking (action completion, weekly adherence, streaks)

## Build and install like a normal app

1. Configure app env:
   - `EXPO_PUBLIC_BACKEND_URL`:
     - Leave blank if you want an installable app with no backend dependency.
     - Set this to a deployed backend URL if you want WHOOP OAuth/sync and backend-powered reflections in the installed build.
   - `EXPO_PUBLIC_WHOOP_CLIENT_ID`:
     - Required only if using WHOOP in the installed build.
   - `EXPO_PUBLIC_LLM_URL`:
     - Optional. If omitted, the app uses `${EXPO_PUBLIC_BACKEND_URL}/explain` when a backend URL is configured.
2. Configure backend env only if you are deploying the backend:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_STORE_KEY` (recommended)
   - `OPENAI_API_KEY` (optional)
3. Build with EAS:
   - Android: `npx eas build -p android --profile preview`
   - iPhone device: `npx eas build -p ios --profile preview`
   - iPhone simulator: `npx eas build -p ios --profile ios-simulator`

Installed-build behaviour:
- No backend URL configured:
  - Core check-in, LBI, rule-based plan, explainability, history, trends, and exports still work.
  - WHOOP sync and backend LLM reflections are disabled gracefully.
- Backend URL configured:
  - WHOOP OAuth/sync and backend-powered reflections are available.

## Simplest full deployment path

If you want the installed app to work fully for a supervisor or tester, the simplest setup is:

1. Deploy the backend as a single Node web service.
   - This repo includes [render.yaml](/Users/ami/Projects/life-balance-app/render.yaml) for a Render deployment from the repo root.
2. Set these backend env vars in the host:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_STORE_KEY`
   - `OPENAI_API_KEY` (optional)
3. Confirm backend health:
   - `https://your-backend-url/health`
4. Set app env before the EAS build:
   - `EXPO_PUBLIC_BACKEND_URL=https://your-backend-url`
   - `EXPO_PUBLIC_WHOOP_CLIENT_ID=your_whoop_client_id`
5. In the WHOOP developer dashboard, allow the app redirect URI using the app scheme:
   - `lifebalanceapp://whoop-auth`
6. Build the app with EAS and install it from the generated link.

## Run locally for development

1. Install dependencies:
   - `npm install`
   - `cd backend && npm install`
2. Configure env:
   - App `.env`:
   - `EXPO_PUBLIC_BACKEND_URL` (optional in installable builds; required for local WHOOP/LLM backend testing)
   - `EXPO_PUBLIC_WHOOP_CLIENT_ID`
   - `EXPO_PUBLIC_LLM_URL` (optional)
   - Backend `backend/.env`:
     - `WHOOP_CLIENT_ID`
     - `WHOOP_CLIENT_SECRET`
     - `WHOOP_STORE_KEY` (recommended, encrypts server-side WHOOP token store at rest)
     - `OPENAI_API_KEY` (optional if using LLM route)
     - `SERVER_API_KEY` (optional)
     - `CORS_ORIGINS` (comma-separated dev origins)
3. Start backend:
   - `cd backend && npm run dev`
4. Start app:
   - `npm run start`
5. Health check backend:
   - `curl http://localhost:3333/health`

## Verification

- TypeScript: `npx tsc --noEmit`
- Unit tests (all 11 suites, 22 tests):
  - `npm test`
  - Individual: `node --no-warnings --import tsx tests/<name>.test.ts`
  - Suites: errors, privacy, retention, whoop-normalize, baseline, analytics, ml-eval, plan, report, transparency, counterfactual

## Ethics and safety features

- App consent with explicit items and timestamp (`/profile/settings/consent`)
- WHOOP-specific consent and withdrawal (`/profile/settings/consent-whoop`)
- Privacy notice (`/profile/settings/privacy`)
- Retention controls + purge now (`/profile/settings/data`)
- Insights hidden when consent withdrawn
- Export controls: anonymise participant ID + redact free text
- LLM toggle and safety short-circuit for self-harm language

## Backend hardening implemented

- WHOOP session token required via `Authorization: Bearer` (no query-token flow)
- Session expiry enforced server-side with refresh route
- Per-IP and per-session rate limiting
- Request body size limits and invalid JSON handling
- Strict `YYYY-MM-DD` validation for WHOOP day fetch
- Origin allow-list enforcement for browser requests
- WHOOP token store encryption-at-rest when `WHOOP_STORE_KEY` is set
- Health endpoint: `GET /health`

## Demo WHOOP mode (for markers and no-device evaluation)

The real WHOOP OAuth path remains the primary integration. For academic
markers and supervisors who do not have a WHOOP account, the app exposes
a clearly-labelled **Demo WHOOP** path that seeds 7 days of realistic,
deterministic, normalized wearable data through the same pipeline the live
sync uses.

How to activate:

1. Open the app (any route — Expo Go or installed pilot build).
2. Tab to **Profile → Integrations → WHOOP**.
3. In the **Demo WHOOP data** card, tap **Use 7-day demo WHOOP data**.

What this unlocks:

- LBI scoring with full physiological inputs (recovery, sleep, strain)
- Plan generation conditioned on wearable data
- History, trends, correlations
- ML risk outlook and adherence analyses (H3, H7)
- Transparency / data-coverage panels (which render every demo day as
  **WHOOP (demo)**, never as live WHOOP)
- Research export bundles (provenance is preserved as `whoop_demo` in JSON)

Implementation: [lib/demoWhoop.ts](/Users/ami/Projects/life-balance-app/lib/demoWhoop.ts).
The real OAuth path in [app/(tabs)/profile/integrations/whoop.tsx](/Users/ami/Projects/life-balance-app/app/(tabs)/profile/integrations/whoop.tsx)
and [backend/whoop.ts](/Users/ami/Projects/life-balance-app/backend/whoop.ts)
is untouched and continues to be the production code path for the viva
demonstration and pilot testers with real devices.

## Pilot install

The pilot build is distributed via EAS internal distribution. The deployed
backend (`https://life-balance-assistant.onrender.com`) is already baked into
the build profile in [eas.json](/Users/ami/Projects/life-balance-app/eas.json),
so testers do not need to set environment variables themselves.

### For testers

1. Open the install link sent to you (Android APK or iOS TestFlight invite).
2. Install and open **Life Balance Assistant**.
3. On first launch, complete onboarding and consent.
4. Optional: connect WHOOP under **Profile → Integrations → WHOOP**.
   The deep-link redirect URI is `lifebalanceapp://whoop-auth` — already
   registered on the WHOOP developer dashboard for this client.
5. Use the app daily for 5–7 days. All data is stored on-device
   (AsyncStorage); the backend only handles WHOOP OAuth proxying and
   optional LLM narrative reflections.

### For me (releasing a pilot build)

```bash
# Android APK (sideload-friendly):
npx eas build -p android --profile preview

# iOS internal distribution build:
npx eas build -p ios --profile preview
```

The `preview` profile in `eas.json` already injects:

- `EXPO_PUBLIC_BACKEND_URL=https://life-balance-assistant.onrender.com`
- `EXPO_PUBLIC_WHOOP_CLIENT_ID` (the OAuth public client ID — not secret)

If the backend is unreachable when a tester opens the app, **the app still
works**: check-in, LBI, plan, history, exports, and ML risk all run locally;
only WHOOP sync and LLM-powered reflections degrade gracefully (the app
falls back to deterministic local reflections — see [lib/llm.ts](/Users/ami/Projects/life-balance-app/lib/llm.ts)).

## Examiner quick start

This section is for dissertation examiners and supervisors evaluating the prototype.

### Option A — Installed app (recommended, no setup required)

> An EAS build link and/or TestFlight/APK link will be included in the dissertation appendix.

1. Open the install link on your device (iPhone or Android).
2. Install and open the app.
3. On first launch, tap through the consent screen.
4. The app works fully offline with no WHOOP device:
   - Go to **Profile → Settings → Demo Tools**.
   - Tap **Seed 30-day demo dataset** to populate realistic synthetic data.
   - Navigate Home to see the LBI orb, weekly strip, and plan.
   - Go to **Insights** to explore correlations, baselines, ML risk, and the H3 adherence analysis.
   - Go to **Profile → Export** to generate a research JSON bundle.

### Option B — Local development (Expo Go)

Requires: Node 20+, npm, Expo Go app on your phone or an iOS/Android simulator.

```bash
git clone <repo>
npm install
npm start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iPhone, when using Expo Go from App Store).

- No backend or WHOOP credentials required — demo mode works standalone.
- To run the unit test suite: `npm test`

### What to look for

| Area | Where |
|------|--------|
| LBI score + explanation | Home tab → tap the orb |
| Daily check-in | Check-in tab |
| Rule-based plan + action completion | Home → Today's plan / History tab |
| Correlations with CI + FDR | Insights → Correlations |
| H3 adherence vs next-day LBI | Insights → Adherence & LBI (H3) |
| ML risk outlook | Insights → Risk outlook |
| Model performance (accuracy, AUC) | Insights → Model performance |
| Baseline calibration (median/IQR) | Insights → Baselines |
| Data coverage + transparency | Home → orb long-press OR Insights → Integration |
| SUS usability questionnaire | Profile → Settings → Usability |
| Research export (JSON) | Profile → Export |
| Privacy notice + consent | Profile → Settings → Consent |
| Ethics + safety resources | Profile → Settings → Help |

## Dissertation docs

- `docs/DataFlow.md` — end-to-end data flow diagram
- `docs/Operationalisation.md` — variable definitions mapped to code
- `docs/Hypotheses.md` — H1–H7 (all exploratory)
- `docs/StudyProtocol.md` — feasibility study design
- `docs/ThreatsToValidity.md` — validity threats and mitigations
