import { calculateLBI, DefaultModelConfig, ModelConfig, LbiInput } from "./lbi";

export type SensitivityResult = {
  config: ModelConfig;
  lbi: number;
};

export function runSensitivity(input: LbiInput, pct = 0.1, samples = 5): SensitivityResult[] {
  const results: SensitivityResult[] = [];
  for (let i = 0; i < samples; i++) {
    const w = DefaultModelConfig.weights;
    const tweak = (val: number) => val * (1 + (Math.random() * 2 - 1) * pct);
    const cfg: ModelConfig = {
      ...DefaultModelConfig,
      version: `${DefaultModelConfig.version}-sens-${i + 1}`,
      weights: {
        objective: tweak(w.objective),
        subjective: tweak(w.subjective),
        recovery: tweak(w.recovery),
        sleep: tweak(w.sleep),
        mood: tweak(w.mood),
        stress: tweak(w.stress),
      },
      thresholds: DefaultModelConfig.thresholds,
    };
    const lbi = calculateLBI({ ...input, config: cfg }).lbi;
    results.push({ config: cfg, lbi });
  }
  return results;
}

export function stabilityScore(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const sd = Math.sqrt(variance);
  return sd;
}

