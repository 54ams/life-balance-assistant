# Life Balance Assistant (LBA)

Expo Router + TypeScript mobile app with an optional Node backend for WHOOP OAuth/token handling and optional LLM narrative reflection.

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
- Unit tests:
  - `node --import tsx tests/baseline.test.ts`
  - `node --import tsx tests/analytics.test.ts`
  - `node --import tsx tests/ml-eval.test.ts`
  - `node --import tsx tests/whoop-normalize.test.ts`

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

## Dissertation docs

- `docs/Operationalisation.md`
- `docs/Hypotheses.md`
- `docs/StudyProtocol.md`
- `docs/ThreatsToValidity.md`
