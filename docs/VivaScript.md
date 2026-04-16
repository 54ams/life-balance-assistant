# Viva Script — Life Balance Assistant (LBA)

A ~12-minute walkthrough that leads the examiner from motivation → contribution → evaluation. Every gesture below maps to a feature that is already implemented in the prototype, so offline / no-wifi scenarios are safe.

Viva date reference: **2026-04-23** (one week from 2026-04-16).

---

## 0. Before the examiner arrives

Between examiners, run the **kiosk reset gesture** to return the device to a clean state:

1. Long-press the greeting ("Good morning") in the Home header until the selection haptic fires (~1s).
2. Triple-tap the greeting within 2 seconds.
3. Confirm the destructive alert.

The app returns to the animated **welcome** screen.

---

## 1. Welcome and the ethics frame (≈1 min)

> "This is Life Balance Assistant — a prototype that bridges physiological signals from wearables with self-reported mental state. Let me start by showing you the welcome flow, because it encodes a central design constraint: ethics."

- Let the breathing circle animation settle (3 concentric rings, 4s inhale/exhale).
- Tap **Begin**.
- On the onboarding screen, stop at the "Your privacy, up front" card:

> "LBA never asks for a name, email, or phone number. This is a direct consequence of my ethics approval — the app personalises using non-identifying attributes only: a goal, a tone, and a rough sleep window."

- Tap through Values, Context, Personalise (pick a goal, tone, sleep window), Consent.

---

## 2. First-run split: demo vs fresh (≈30s)

> "This screen is viva-specific. Examiners choose 'Exploring the demo' so we have 14 days of seeded data to discuss; a real participant would pick 'Starting fresh'."

- Tap **Exploring the demo**. Land on Home.
- Point at the small **Demo data** chip in the header — visual reminder that the data is seeded.

---

## 3. The core contribution: Mind–Body Bridge (≈3 min)

> "The gap I identified in competing apps — WHOOP, Calm, Stoic, Welltory — is that they silo physiological from mental signals. My prototype's core contribution is making that bridge legible."

### On Home
- Point at the **Today's bridge** card (green Body / purple Mind dials, plus a gap sentence).
- Narrate the sentence the card produces:
  - If aligned: "Body and mind are aligned today."
  - If divergent: "Your body is ahead of your mind" or "Your mind is ahead of your body".
- Tap the card → **/insights/bridge**.

### In the bridge insights screen
- Walk through the 14-day dual-track chart. Point at divergent days.
- Point at the **"What your data says"** card — the plain-English sentence is auto-generated from the strongest physio↔mental pair with FDR-filtered lag correlation.
- Open the **Statistical details** row: examiner can see method, `r`, `n`, `lag`.

### Optional talking point
> "Hypothesis H8 in the dissertation is that surfacing this paired view helps users interpret transitions neither axis shows alone. The bridge inherits FDR correction and min-N gates from `analytics.ts`, so it stays honest with small samples."

---

## 4. Scenario presets — steerable demo narrative (≈2 min)

> "Because the viva might run differently depending on what you ask, I built seven deterministic scenarios so I can steer the demo live without Math.random() surprises."

- Profile → Settings → Demo tools → scroll to **Scenario presets**.
- Scenarios available:
  - **Healthy week** — baseline case.
  - **Stress spike** — demonstrates the lag: mental signals on day N → physiological drop day N+1.
  - **Recovery dip** — baseline deviation detection and recovery-biased plan suggestions.
  - **Sleep debt** — H2 (stress indicators vs LBI) and the ≥35% sleep weight in LBI.
  - **Burnout recovery** — rough week one, rebuild week two.
  - **Training block** — Mon/Wed/Fri training, Tue/Thu rest.
  - **Exam week** — build-up + peak + rebound.
- Tap **Stress spike** → examiner sees the narrative live on Home and the Bridge screen.

Each scenario is seeded from a deterministic PRNG (`mulberry32`), so repeated runs produce identical charts.

---

## 5. Check-in → post-save bridge animation (≈1.5 min)

- Go to **Check-in** tab. Fill in a fast check-in (sliders + a value + optional reflection).
- Submit. Land on the **post-save bridge animation**: two dots glide toward each other and pulse.
- The subtitle reflects the gap ("in step", "body ahead", "mind ahead").
- Auto-forwards to Home after ~2.8s.

> "This micro-moment is deliberately non-clinical — no score shaming, just a visual reminder of the two axes the app cares about."

---

## 6. Reflection LLM — offline-first (≈1 min)

- On the Check-in screen show the reflection button.
- Triggering it in the viva environment will **silently fall back** to the deterministic template if the OpenAI-proxied backend is unreachable.
- Point at the italic **local** / **safety** badges under the reflection text — the examiner can verify whether the text came from the remote model or the fallback.

> "This was the original LLM-failed bug from my status report. The app now returns a tone-aware template reflection in the user's chosen tone — Gentle, Direct, or Playful — with zero error surfacing, zero null returns. Viva-safe by design."

---

## 7. Transparency and safety rails (≈1 min)

- Long-press the LBI orb on Home → **Transparency drawer**: model version, confidence, missingness summary.
- Open Profile → Privacy → note the retention-purge, export anonymisation, and consent controls.
- Open Insights → Model performance for the calibration bins.

---

## 8. Recovery from any error (safety net)

- If anything throws, the **AppErrorBoundary** shows a **Reset demo data** button that clears everything and reseeds 14 days — no dev console required.

---

## 9. Q&A anchors

Keep these hypotheses ready:

- **H1–H3**: basic associations (sleep/recovery ↔ LBI, stress ↔ LBI, adherence ↔ next-day LBI).
- **H4**: baseline-relative deltas vs absolute (see `lib/baseline.ts`).
- **H5**: confidence + missingness messaging on the Transparency drawer.
- **H6**: FDR + CI + min-N in `lib/analytics.ts`.
- **H7**: weekly reflective narrative at `/insights/weekly`.
- **H8 (new)**: Mind–Body Bridge paired score.

---

## Rehearsal checklist (run the evening before)

- [ ] Phone fully charged; airplane mode **off** but expect wifi to be unreliable.
- [ ] Open the app and step through **kiosk reset** once — confirm it returns to `/welcome`.
- [ ] Walk through the full onboarding; confirm no name/email/phone fields appear.
- [ ] Choose **Exploring the demo** on first-run; confirm **Demo data** chip appears on Home.
- [ ] Tap through each of the seven scenario presets; visually confirm the 14-day arc on Home differs.
- [ ] Trigger a check-in; confirm the post-save bridge animation plays and Home reloads fresh.
- [ ] On Check-in, disable wifi, tap reflection; confirm the **local** badge shows and text reads naturally.
- [ ] Re-enable wifi, tap reflection; confirm the **remote** path works.
- [ ] Open the Bridge insights screen; confirm dual-track chart renders with both tracks and the insight sentence reads sensibly.
- [ ] Open the Transparency drawer; confirm model version + confidence surface.
- [ ] Run `npm run test:unit` — all viva-smoke tests green.
- [ ] Close all other apps; turn on "do not disturb".
