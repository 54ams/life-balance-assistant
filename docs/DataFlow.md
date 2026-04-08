# Data Flow

End-to-end data flow through the Life Balance Assistant prototype.

---

## 1. Input sources

```
┌─────────────────────┐        ┌─────────────────────────┐
│   WHOOP wearable    │        │  Daily check-in (user)  │
│  (via OAuth/sync)   │        │  mood · energy · stress  │
│  recovery 0-100     │        │  sleep · behaviours      │
│  sleepHours         │        │  stressIndicators        │
│  strain 0-21        │        │  deepWorkMins · notes    │
└──────────┬──────────┘        └────────────┬────────────┘
           │                                │
           ▼                                ▼
  lib/wearables.ts                lib/storage.ts
  normalise + guard               upsertCheckIn()
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
             lib/storage.ts (DailyRecord)
             AsyncStorage key:
             "life_balance_daily_records_v1"
```

---

## 2. LBI pipeline (triggered on save)

```
DailyRecord (wearable + checkIn)
           │
           ▼
  lib/lbi.ts  calculateLBI()
  ┌──────────────────────────────────────────┐
  │  Objective (70%):                        │
  │    recovery × 0.5  +  sleepScore × 0.5   │
  │                                          │
  │  Subjective (30%):                       │
  │    moodScore × 0.5  +  stressScore × 0.5 │
  │                                          │
  │  Penalty: highStrain + lowRecovery → -6  │
  │  Clamp [0, 100] → roundInt               │
  └──────────────────────────────────────────┘
           │
           ▼
  LbiOutput { lbi, classification,
              confidence, subscores }
           │
           ├──────────────────────────────────────┐
           ▼                                      ▼
  lib/baseline.ts                     lib/plan.ts  generatePlan()
  computeBaselineMeta()               rule-based RECOVERY / NORMAL
  rolling 14d median + IQR            with actionReasons[]
           │                                      │
           └──────────────┬───────────────────────┘
                          │
                          ▼
               lib/storage.ts  savePlan()
               AsyncStorage key:
               "life_balance_plan_v1:<date>"
```

---

## 3. Derived insights

```
DailyRecord[] (up to 30 days)
           │
           ├──────────────────────────────────────────────────┐
           │                                                  │
           ▼                                                  ▼
  lib/analytics.ts                              lib/ml/dataset.ts
  buildAnalyticsSummary()                       buildDataset()
  - Pearson + Spearman r                        z-score features
  - bootstrap CI (500 samples)                  (recovery, sleep, strain,
  - permutation p-value                          mood, stress, lbi)
  - BH-FDR correction                                    │
  - lagged correlations (0-3d)                            ▼
  - H3: computeAdherenceCorrelation()           lib/ml/logreg.ts  train()
    plans × records → adherence vs              logistic regression
    next-day LBI (Spearman, lag=1)                       │
           │                                             ▼
           │                               lib/ml/models.ts  predict()
           │                               lbiRiskProb · recoveryRiskProb
           │                               topDrivers[]
           │
           ├──────────────────────────────────────────────────┐
           │                                                  │
           ▼                                                  ▼
  lib/explain.ts                            lib/counterfactual.ts
  buildExplanation()                        buildCounterfactuals()
  topDrivers[] + strength                   what-if LBI deltas:
  + accuracyReasons[]                       +45min sleep / -1 stressor
                                            / +1 mood
           │
           ▼
  lib/consistency.ts
  computeConsistencyScores()
  sleep/recovery/mood/checkin regularity
  SD-based penalties → 0-100
```

---

## 4. Emotional diary

```
AffectCanvas (user touch input)
  valence × arousal → intensity
           │
           ▼
  upsertEmotion() → DailyRecord.emotion
  { valence, arousal, intensity,
    regulation, valueChosen,
    contextTags, reflection }
           │
           ▼
  lib/llm.ts  reflectEmotion()          backend/api/explain.ts
  (optional, user-triggered)       ───►  GPT-4o-mini
  safety short-circuit                   ≤80-word narrative
  self-harm keyword filter               non-directive / hedged
           │
           ▼
  EmotionalDiaryEntry.reflection (stored)
           │
           ▼
  lib/emotion.ts  getWeeklyEmotionStats()
  valence/arousal quadrant counts
  regulation frequency
  value frequency → identity line
```

---

## 5. Research export

```
AsyncStorage (all data)
           │
           ▼
  lib/export.ts  exportPlans()
  ┌───────────────────────────────────────────────┐
  │  DailyRecord[] (with optional free-text        │
  │    redaction and participant ID hashing)        │
  │  StoredPlan[] (with completedActions[])         │
  │  SUS submissions (lib/evaluation/storage.ts)    │
  │  BaselineMeta (14-day median/IQR)               │
  │  AnalyticsSummary (correlations + descriptives) │
  │  AdherenceCorrelation (H3 Spearman, lag=1)      │
  │  ModelEvaluation (accuracy, AUC, calibration)   │
  │  ModelConfig (version, weights, thresholds)     │
  │  ModelSensitivity (±10% perturbation, SD)       │
  │  AdherenceSummary (%, streak, completedDays)    │
  │  Ethics block (consent, retention, LLM toggle)  │
  └───────────────────────────────────────────────┘
           │
           ▼
  JSON blob → expo-file-system share sheet
  (anonymised participant reference)
```

---

## 6. Privacy and consent gating

```
app start
     │
     ▼
lib/privacy.ts  getAppConsent()
     │
     ├── no consent → consent screen (blocks tab access)
     │
     └── consent recorded
          │
          ├── WHOOP consent → lib/privacy.ts WHOOP_CONSENT_KEY
          │    withdrawal disables sync + hides wearable insights
          │
          ├── retention policy → purgeOldData(retentionDays)
          │    applies to: DailyRecord, plans, future events, SUS
          │
          ├── self-harm filter → containsSelfHarmSignals()
          │    checked in: check-in save, LLM request, backend
          │
          └── export options
               anonymizeParticipantId → hashParticipantId()
               redactFreeText → removes notes + reflection
```

---

## Key library modules summary

| Module | Input | Output |
|--------|-------|--------|
| `lib/lbi.ts` | wearable + checkIn | LBI score 0-100, classification, confidence |
| `lib/baseline.ts` | 14d DailyRecord[] | median, IQR, stability per signal |
| `lib/plan.ts` | LbiOutput + signals | RECOVERY/NORMAL plan + actionReasons |
| `lib/analytics.ts` | DailyRecord[] + plans | correlations, descriptives, H3 adherence r |
| `lib/ml/` | 14d feature rows | LBI-drop + recovery-drop risk probabilities |
| `lib/explain.ts` | LbiOutput + signals | top drivers + counterfactuals |
| `lib/consistency.ts` | DailyRecord[] | regularity scores 0-100 |
| `lib/export.ts` | all of the above | anonymised JSON research bundle |
| `lib/privacy.ts` | AsyncStorage | consent state, retention, safety filters |
| `lib/llm.ts` | emotion payload | ≤80-word hedged narrative reflection |
