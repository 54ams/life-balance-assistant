# Submission notes — Life Balance Assistant

For dissertation markers, viva examiners, and pilot testers.

## At a glance

| Resource | URL |
|---|---|
| Live web/PWA | https://life-balance-assistant.vercel.app |
| Backend | https://life-balance-assistant.onrender.com |
| Backend health | https://life-balance-assistant.onrender.com/health |
| Source | the zipped repository (this folder) |

You do **not** need a WHOOP device, WHOOP credentials, an Apple Developer
account, or my laptop to evaluate the prototype. A 30-day demo dataset
is built in.

---

## Recommended demo route (viva-friendly, ~5 minutes)

Read this *before* the viva. Each step has a "what it demonstrates"
note so you can map it to the dissertation argument.

1. **Open** <https://life-balance-assistant.vercel.app> in a private
   window (avoids stale PWA cache).

2. **Welcome animation** plays — meditative breathing rings, sets the
   "calm space" tone.
   *Demonstrates: design intent, ethics-first framing.*

3. **Onboarding** (5 short steps): values, life context, personalise
   (goals + tone + sleep window), consent.
   *Demonstrates: privacy by design, consent gating, personalised tone.*

4. **First-run picker** — choose **Have a look around first**.
   This seeds 30 days of synthetic data and runs the **guided tour**.
   *Demonstrates: zero-data evaluation path, guided onboarding.*

5. **Home screen** — the orb is the focal point.
   - Tap the orb → goes to **/insights/bridge** (the H8 Mind–Body Bridge).
   - The **Today's insight** card shows ML-classified guidance with
     provenance (`ml`, `ml-cold-start`, `+llm`, `rules`).
   - The **Today's habits** strip shows progress and streak.
   - The **8-week heatmap** shows data density.
   *Demonstrates: H8 novelty, explainability, ML transparency.*

6. **Insights tab** — three highlights:
   - **Correlations** — with confidence intervals + FDR correction.
   - **Risk outlook** — ML next-day classification.
   - **Baselines** — median/IQR per signal.
   *Demonstrates: H1–H7 quantitative analyses, statistical rigour.*

7. **Profile → Integrations → WHOOP** — show the connect flow.
   Either:
   - Tap **Connect WHOOP** for the live OAuth path
     (works in production private window — see Troubleshooting if it
     misbehaves).
   - **Or** tap **Use 30-day demo WHOOP data** for the labelled
     demo path through the *same* wearable pipeline.
   *Demonstrates: real OAuth integration with a fallback that does not
   compromise data integrity.*

8. **Profile → Settings → Demo tools → Scenario presets** —
   each scenario rewrites the 14-day window with a designed arc
   (stress spike, sleep debt, burnout-recovery, exam week…).
   *Demonstrates: viva-steerable storytelling without faking live
   data — the same pipeline; different inputs.*

9. **Profile → Export → Research export** — generates a JSON bundle
   with provenance preserved.
   *Demonstrates: research-grade transparency.*

---

## What to do if WHOOP misbehaves during the viva

**The viva-safe fallback is already wired in.** If WHOOP fails:

1. The error alert offers three options: *Try again*, *Use demo data*,
   *Cancel*.
2. *Use demo data* immediately seeds 30 days of WHOOP-shaped data
   labelled "WHOOP (demo)" through the real pipeline. The dashboard,
   insights, ML, and exports continue to work.
3. The user is never stuck on a dead error.

If the entire backend is unreachable (Render is sleeping), the app still
runs locally — only WHOOP sync and LLM-powered reflections degrade.

## Pre-viva checklist (do these 30 minutes before)

1. **Warm the backend.** Hit
   <https://life-balance-assistant.onrender.com/health> in a browser
   and confirm a 200 response. This avoids the ~30 s cold-start when
   the examiner first connects.
2. **Test the live URL** in a fresh private window
   (Cmd-Shift-N / Ctrl-Shift-N).
3. **Have demo paths ready as a backup**:
   - 30-day full demo (Profile → Settings → Demo tools)
   - Demo WHOOP (Profile → Integrations → WHOOP)
4. **Have the local Expo Go fallback ready** in case the deployed web
   build has an unexpected issue:
   ```bash
   npm install && npm start
   ```

## What is included in the source zip

| Folder | Contents |
|---|---|
| `app/` | Expo Router screens (welcome, onboarding, first-run, tabs, WHOOP callback) |
| `components/` | Reusable UI components, error boundary |
| `constants/` | Theme, spacing, shadows, typography |
| `lib/` | Domain logic (LBI, bridge, plan, baselines, ML, demo, errors) |
| `backend/` | Node service for WHOOP OAuth + LLM proxy |
| `tests/` | Unit-test suites |
| `docs/` | Hypotheses, operationalisation, data flow, study protocol, threats to validity |
| `README.md` | Full setup guide |
| `SUBMISSION.md` | This file |

## What is excluded and why

| Excluded | Reason |
|---|---|
| `node_modules/`, `backend/node_modules/` | ~550 MB; restore with `npm install` |
| `dist/`, `.expo/`, `backend/dist/` | Build artefacts; regenerated on demand |
| `.env`, `backend/.env` | Real secrets — see `.env.example` |
| `backend/.data/` | Server-side WHOOP token store; not for distribution |

## Inspection routes

### Route A — Live URL (no install)

Open <https://life-balance-assistant.vercel.app>. Done.

### Route B — Read the code

Most-important files for the dissertation argument:

| Concern | File |
|---|---|
| LBI scoring pipeline | `lib/pipeline.ts`, `lib/lbi.ts` |
| Mind–Body Bridge (H8 novelty) | `lib/bridge.ts`, `app/(tabs)/insights/bridge.tsx` |
| Hypotheses H1–H8 | `docs/Hypotheses.md` |
| Operationalisation | `docs/Operationalisation.md` |
| Data flow | `docs/DataFlow.md` |
| Study protocol | `docs/StudyProtocol.md` |
| Threats to validity | `docs/ThreatsToValidity.md` |
| Privacy / consent / retention | `lib/privacy.ts`, `app/(tabs)/profile/settings/` |
| Backend (WHOOP OAuth + LLM) | `backend/server.ts`, `backend/whoop.ts`, `backend/api/explain.ts` |
| ML recommender (H7) | `lib/ml/` |
| WHOOP demo path | `lib/demoWhoop.ts` |

### Route C — Run unit tests

```bash
npm install
npm test
npx tsc --noEmit
```

### Route D — Run via Expo Go

```bash
npm install
npm start          # then scan the QR with Expo Go
```

No `.env` configuration required; demo mode works standalone.

## Honesty statement

- The Render backend is on the free tier and **cold-starts** (~30 s on
  first request after idle). The app handles this with a 30 s timeout
  and a *"Backend is waking up"* message.
- WHOOP integration is optional. The dissertation claims about WHOOP
  are evaluable via the demo WHOOP path, which uses the **same**
  pipeline as the live integration but is clearly labelled and
  preserves provenance in exports.
- The app is non-diagnostic and non-medical. The onboarding consent
  flow makes this explicit; the safety screen surfaces Samaritans
  (116 123) and 999 as crisis resources.
- All on-device data; nothing leaves the phone unless the user
  explicitly exports.
