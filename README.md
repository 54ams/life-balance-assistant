# Life Balance Assistant (LBA)

An Expo Router + TypeScript prototype that brings physiological signals
(WHOOP recovery, sleep, strain) and psychological signals (daily check-in,
mood, stress, habits) onto a single canvas — the **Mind–Body Bridge** —
so users can see their day-to-day life balance in one calm, observational
view.

Built as a final-year synoptic dissertation prototype (BCS).

| | URL |
|---|---|
| Live web/PWA | https://life-balance-assistant.vercel.app |
| Backend (Render) | https://life-balance-assistant.onrender.com |
| Backend health | https://life-balance-assistant.onrender.com/health |

> **For dissertation markers:** see [Examiner quick start](#examiner-quick-start).
> A 30-day demo dataset is built in — you do **not** need a WHOOP device,
> WHOOP credentials, or Apple Developer access to evaluate the prototype.

---

## What problem this solves

Existing wearable apps (WHOOP, Whoop, Garmin, Apple Health) report
physiological recovery in great detail but treat the mind as a separate
silo. Mental-health apps (mood trackers, CBT journals) do the inverse.
Users have to do the cross-referencing in their head. The dissertation
argues — and the prototype demonstrates — that a single, opinionated
view (the Mind–Body Bridge) plus a Life Balance Index (LBI) gives more
useful day-to-day feedback than either side alone.

This is a **non-diagnostic, observational** tool. It does not give medical
advice and does not provide crisis support.

## Key features

- **Daily check-in** (60 seconds) — three steps: an affect canvas
  (Russell 1980 circumplex of valence × arousal), life-context tags
  (Lazarus & Folkman pressures vs replenishers, with custom tags), and
  an optional free-text note with a "deeper read" button. Legacy
  mood/energy/stress scales are derived from these inputs (see
  `lib/derive.ts`).
- **WHOOP integration** — OAuth 2.0 connect for recovery, sleep, strain.
  Web (PWA) and native both supported.
- **Mind–Body Bridge** — single dual-axis state (`physio` × `mental`) with
  a calm aurora-coloured orb that reflects today's balance: sage when
  body and mind are aligned, terracotta when the body is ahead, teal
  when the mind is ahead, olive when both are neutral.
- **Life Balance Index (LBI)** — composite score with explainability
  (which features moved the score, why).
- **Insights tab** — correlations (with FDR), baselines (median/IQR),
  pattern interrupts, ML risk outlook, weekly reflection prompts,
  cycles and trends.
- **Habits, anchors (dawn/dusk rituals), micro-interventions** —
  realign breath sessions when the bridge is divergent.
- **Demo mode** — seeds 30 days of synthetic but realistic check-ins,
  wearable data, and computed LBI scores. Clearly labelled "Demo data".
- **Privacy by design** — all data is stored on-device (AsyncStorage).
  Nothing leaves the phone unless the user explicitly exports. WHOOP
  tokens live only on the backend, encrypted at rest.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile / web | Expo SDK 54, React Native 0.81, expo-router | Web export deploys as a PWA |
| Language | TypeScript 5.9 | strict |
| Styling | StyleSheet + custom theme (`constants/Colors.ts`) | Cream canvas + lime accent |
| Storage | `@react-native-async-storage/async-storage` | All user data on-device |
| Backend | Node `http` server + TypeScript (no Express) | Render web service |
| OAuth | WHOOP API v2 | client secret only on backend |
| LLM (optional) | OpenAI via backend | Local fallback if backend offline |
| Testing | Built-in `node --import tsx` test runner | `tests/*.test.ts` |

## Architecture overview

```
app/                  Expo Router routes
  (tabs)/             Home, Check-in, Insights, Profile
  welcome.tsx         First-launch animation
  onboarding.tsx      Values, context, consent
  first-run.tsx       Demo vs fresh start
  whoop-auth.tsx      Web OAuth callback (WHOOP redirects here)
components/
  ui/                 GlassCard, GlassButton, AuroraBackground, StateOrb,
                      TourOverlay, FloatingTabBar, etc.
constants/            Colors, Spacing, Shadows, Typography
lib/                  Domain logic (LBI, bridge, plan, baselines, ML, etc.)
  demo.ts             30-day demo seeder
  demoWhoop.ts        WHOOP-shaped demo wearable data (labelled provenance)
  backend.ts          Backend URL resolution + cold-start handling
  errors.ts           User-friendly error mapping
backend/              Node service for WHOOP OAuth + optional LLM
  server.ts           HTTP server — routes by req.method + req.url
                      (health, /whoop/exchange, /whoop/day, /whoop/refresh,
                      /whoop/session, /explain)
  whoop.ts            WHOOP token exchange + refresh
  api/explain.ts      OpenAI explain helper
docs/                 Dissertation supporting docs
tests/                Unit tests
```

## Environment variables

> **Secrets (`*_SECRET`, `OPENAI_API_KEY`) belong on Render only.** Anything
> with the `EXPO_PUBLIC_` prefix is bundled into the client and is *not*
> secret — only the WHOOP **client ID** is public.

### Vercel (web/PWA build)

| Variable | Required | Value |
|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | yes | `https://life-balance-assistant.onrender.com` |
| `EXPO_PUBLIC_WHOOP_CLIENT_ID` | yes | the WHOOP OAuth public client ID |

### Render (backend)

| Variable | Required | Notes |
|---|---|---|
| `WHOOP_CLIENT_ID` | yes | from the WHOOP developer dashboard |
| `WHOOP_CLIENT_SECRET` | yes | secret — never expose to the client |
| `WHOOP_STORE_KEY` | recommended | encrypts the on-disk token store at rest |
| `OPENAI_API_KEY` | optional | enables LLM-powered reflection text |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |
| `CORS_ORIGINS` | yes | comma-separated allow-list (must include the Vercel domain) |

### EAS (native builds)

`eas.json` already injects `EXPO_PUBLIC_BACKEND_URL` and
`EXPO_PUBLIC_WHOOP_CLIENT_ID` into the `preview` and `production` profiles
so the APK/IPA do not require a `.env` file at build time.

---

## Running locally

### Prerequisites

- Node 20+
- npm
- Optional: Expo Go on iPhone/Android, or an iOS/Android simulator

### Web/PWA (fastest)

```bash
npm install
npx expo start --web
```

Opens at `http://localhost:8081`. The app autodetects whether the backend
is reachable; with the `.env.example` defaults the prototype works fully
on-device (no backend needed).

### Mobile via Expo Go

```bash
npm install
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

### Production web export (matches Vercel deploy)

```bash
npx expo export --platform web
# Output: ./dist
npx serve dist          # preview locally
```

### Backend

```bash
cd backend
npm install
npm run dev            # http://localhost:3333
curl http://localhost:3333/health
```

You only need the backend running locally if you want to test WHOOP OAuth
or LLM reflections end-to-end. The mobile app degrades gracefully without it.

---

## Production deployment

### Frontend (Vercel)

`vercel.json` is included with SPA rewrites so deep links resolve to
`index.html`. Vercel project settings:

- Framework preset: **Other**
- Build command: `npx expo export --platform web`
- Output directory: `dist`
- Install command: `npm install`
- Env vars: `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_WHOOP_CLIENT_ID`

### Backend (Render)

`render.yaml` is included with the service definition. After the first
deploy, add the deployed Vercel domain to `CORS_ORIGINS` so the browser
can call `/whoop/exchange`.

### Native (EAS)

```bash
npx eas build -p android --profile preview     # APK
npx eas build -p ios --profile preview         # internal distribution
```

`eas.json` already injects the env vars, so no extra setup is required.

---

## WHOOP OAuth notes

- **Redirect URIs (must be registered exactly in the WHOOP dashboard):**
  - Web: `https://life-balance-assistant.vercel.app/whoop-auth`
  - Native: `lifebalanceapp://whoop-auth`
- Web flow uses a **full-page navigation** (not a popup) because WHOOP
  enforces strict redirect-URI matching and blocks cross-origin popups.
  See `app/(tabs)/profile/integrations/whoop.tsx` and
  `app/whoop-auth.tsx`.
- Client secret is **never** in the client bundle — token exchange
  happens on the Render backend (`backend/whoop.ts`).
- If the user has just allowed WHOOP access in a fresh browser session,
  use a normal (non-incognito) window — Safari ITP can drop the
  sessionStorage state across tabs.

## Demo mode

Two clearly-labelled demo paths exist so the prototype is fully evaluable
without a WHOOP device:

1. **30-day full demo** — Profile → Settings → Demo tools →
   *Seed 30 days demo data*. Populates check-ins, wearable values, and
   LBI scores. Used by every screen so charts, correlations, ML risk and
   the bridge all have signal.
2. **Demo WHOOP path** — Profile → Integrations → WHOOP →
   *Use 30-day demo WHOOP data*. Routes through the **same** wearable
   pipeline the live OAuth sync uses. Every day is labelled
   "WHOOP (demo)" in the UI, transparency drawer, and exports — never
   presented as live data.

The first-launch flow (`first-run.tsx`) defaults to the 30-day demo so
testers see a populated app immediately.

---

## Examiner quick start

The fastest way to evaluate the prototype:

1. Open <https://life-balance-assistant.vercel.app> in a desktop or
   mobile browser.
2. Tap through the welcome animation and onboarding consent
   (~30 seconds).
3. On "How would you like to start?" pick **Have a look around first**.
   The app seeds 30 days of synthetic data and lands on Home.
4. The **guided tour** runs once. Step through it (or skip).
5. Suggested route to see the dissertation arguments in code:

| What it demonstrates | Where to look |
|---|---|
| Mind–Body Bridge (H8 novelty) | Home → tap the orb → /insights/bridge |
| LBI explainability | Home → `Today's insight` card |
| Correlations with FDR | Insights → Correlations |
| Baselines (median/IQR) | Insights → Baselines |
| ML risk outlook | Insights → Risk outlook |
| WHOOP demo path | Profile → Integrations → WHOOP |
| Privacy / consent / retention | Profile → Settings |
| Research export | Profile → Export |

`SUBMISSION.md` has a recommended viva demo script.

---

## Verification

```bash
npx tsc --noEmit       # type-check
npm test               # 13 unit-test suites (privacy, baselines, ML, etc.)
```

`tests/` also contains four additional suites
(`bridge.test.ts`, `derive.test.ts`, `ml-pipeline.test.ts`,
`smart-rec.test.ts`) used during development; they are not wired into
`npm test` but can be run individually with
`node --no-warnings --import tsx tests/<name>.test.ts`.

The app is also exercised end-to-end via the live deploy.

## Known limitations

- **Render free-tier cold start.** The backend sleeps after ~15 minutes
  idle and takes ~30 s to wake. The app surfaces a *"Backend is waking
  up — try again in a moment"* message and keeps working on-device. For
  the viva, *warm the backend in advance* by hitting `/health`.
- **Web build vs native parity.**
  - Local notifications and haptics no-op on web.
  - File export on web triggers two browser blob downloads (one
    human-readable report, one raw JSON). Native uses
    `expo-file-system` + share sheet.
  - Some BlurView effects render slightly differently across browsers.
- **PWA caching.** If you previously visited the site, hard-reload
  (Cmd-Shift-R) or test in a private window — service-worker caching
  can serve a stale build for up to ~24 h.
- **WHOOP in incognito on iOS Safari.** ITP sometimes drops
  sessionStorage across tabs. Use a normal window if you can.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Backend is waking up" alert | Render cold start | Wait ~30 s and retry |
| WHOOP "auth state mismatch" | Browser blocked sessionStorage | Use a non-incognito window |
| Empty home screen | Fresh-mode user with no check-ins | Tap "Start your first check-in" or load 30-day demo from Profile → Settings |
| Charts look flat | Fewer than 5 days of data | Seed the 30-day demo data |

## Dissertation docs

- `docs/Hypotheses.md` — H1–H8 (all exploratory)
- `docs/Operationalisation.md` — variable definitions mapped to code
- `docs/DataFlow.md` — end-to-end data flow
- `docs/StudyProtocol.md` — feasibility study design
- `docs/ThreatsToValidity.md` — validity threats and mitigations
- `docs/VivaScript.md` — viva demo script and talking points

## Ethics and safety

- Consent is gated and timestamped (`/profile/settings/consent`).
- WHOOP-specific consent and withdrawal (`/profile/settings/consent-whoop`).
- Retention policy with manual purge (`/profile/settings/data`).
- No PII is collected; the optional name field stays on-device.
- Self-harm language short-circuits LLM reflection and shows safety
  resources (Samaritans 116 123, 999) instead.

## Licence and attribution

Final-year dissertation prototype. Built by the author for academic
assessment. Not for commercial use.
