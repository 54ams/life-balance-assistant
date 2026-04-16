# Operationalisation

## Core variables

- `DailyCheckIn` (`lib/types.ts`)
  - `mood`, `energy`, `stressLevel`, `sleepQuality` (1-5)
  - `stressIndicators` (5 boolean flags)
  - `caffeineAfter2pm`, `alcohol`, `exerciseDone` (boolean)
  - `deepWorkMins` (integer), `hydrationLitres` (float), `notes` (optional)
- `WearableMetrics` (`lib/types.ts`)
  - `recovery` (0-100), `sleepHours` (float), `strain` (optional float)
- `DailyRecord` (`lib/types.ts`)
  - joins check-in, wearable, emotion entry, and derived `lbi`/`lbiMeta`
- `StoredPlan` (`lib/storage.ts`)
  - deterministic rule-based plan outputs plus `completedActions[]` adherence flags

## Derived constructs

- Life Balance Index (LBI): `lib/lbi.ts`
  - Versioned `ModelConfig` with explicit weights and thresholds
- Baselines: `lib/baseline.ts`
  - rolling median + IQR + coverage + stability
- Correlations: `lib/analytics.ts`
  - Pearson/Spearman, bootstrap CI, FDR, lag 0-3
- ML evaluation: `lib/ml/eval.ts`
  - chronological split, classification metrics, calibration bins
  - exploratory prediction only; not the source of the daily plan recommendations
- Mind–Body Bridge scores: `lib/bridge.ts`
  - `physioScore` (0–100) derived from `recovery` (primary) with a `sleepHours` fallback
  - `mentalScore` (0–100) derived from `mood`, `energy` (1–5 each, equally weighted) minus a stress-indicator penalty (max 40)
  - Paired visualisation in `app/(tabs)/insights/bridge.tsx`, with the strongest lag-correlated physio↔mental pair from `buildAnalyticsSummary` surfaced as the plain-English insight line

## Privacy and ethics controls

- App consent: `lib/privacy.ts` (`APP_CONSENT_KEY`)
- WHOOP consent: `lib/privacy.ts` (`WHOOP_CONSENT_KEY`)
- Retention policy: `lib/privacy.ts` + `lib/storage.ts` (`purgeOldData`)
- Retention applies to daily records, plans, future events, and SUS submissions.
- Export anonymisation/redaction: `lib/export.ts` with privacy toggles
