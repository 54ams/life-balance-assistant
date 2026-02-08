// lib/ml/models.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllDays } from "../storage";
import { buildDataset, FEATURE_NAMES } from "./dataset";
import { predictProba, trainLogReg, type LogRegModel } from "./logreg";

const KEY = "life_balance_ml_models_v1";

export type DualModels = {
  version: 1;
  windowDays: number;
  k: number;
  trainedAt: string;
  rowsUsed: number;
  lbiDrop: LogRegModel;
  recoveryDrop: LogRegModel;
};

export type RiskPrediction = {
  trained: boolean;
  rowsUsed: number;
  lbiRiskProb: number | null;
  recoveryRiskProb: number | null;
  topDrivers: { name: string; direction: "up" | "down"; strength: number }[];
};

export async function loadModels(): Promise<DualModels | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as DualModels) : null;
}

export async function saveModels(m: DualModels) {
  await AsyncStorage.setItem(KEY, JSON.stringify(m));
}

function topDriversFrom(model: LogRegModel, x: number[]) {
  const contribs = model.weights.map((w, i) => ({
    name: model.featureNames[i],
    v: w * x[i],
  }));
  contribs.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return contribs.slice(0, 3).map((c) => ({
    name: c.name,
    direction: c.v >= 0 ? ("up" as const) : ("down" as const),
    strength: Math.abs(c.v),
  }));
}

/**
 * Train/refresh the personal models if enough data exists.
 * - Requires >= 21 daily rows overall, and >= ~10 supervised rows after filtering.
 */
export async function trainIfReady(): Promise<DualModels | null> {
  const days = await getAllDays();
  if (days.length < 21) return null;

  const dataset = buildDataset(days);
  if (dataset.length < 10) return null;

  const X = dataset.map((r) => r.x);
  const yA = dataset.map((r) => r.yLbiDrop);
  const yB = dataset.map((r) => r.yRecoveryDrop);

  const lbiDrop = trainLogReg(X, yA, [...FEATURE_NAMES], { steps: 900, lr: 0.12, l2: 0.02 });
  const recoveryDrop = trainLogReg(X, yB, [...FEATURE_NAMES], { steps: 900, lr: 0.12, l2: 0.02 });

  const models: DualModels = {
    version: 1,
    windowDays: 14,
    k: 0.75,
    trainedAt: new Date().toISOString(),
    rowsUsed: dataset.length,
    lbiDrop,
    recoveryDrop,
  };
  await saveModels(models);
  return models;
}

/**
 * Predict tomorrow risk based on today's feature vector.
 * This uses the latest trained model and the latest available row features,
 * which are computed as part of the dataset building logic.
 *
 * For simplicity and transparency: we predict using the most recent dataset row (day t),
 * which is z-scored vs its rolling baseline.
 */
export async function predictTomorrowRisk(): Promise<RiskPrediction> {
  const days = await getAllDays();
  const dataset = buildDataset(days);
  const last = dataset.at(-1);

  const models = await loadModels();
  if (!models || !last) {
    return {
      trained: false,
      rowsUsed: dataset.length,
      lbiRiskProb: null,
      recoveryRiskProb: null,
      topDrivers: [],
    };
  }

  const lbiRiskProb = predictProba(models.lbiDrop, last.x);
  const recoveryRiskProb = predictProba(models.recoveryDrop, last.x);

  // drivers: use LBI model (overall balance) for the UI; it’s the primary narrative.
  const topDrivers = topDriversFrom(models.lbiDrop, last.x);

  return {
    trained: true,
    rowsUsed: models.rowsUsed,
    lbiRiskProb,
    recoveryRiskProb,
    topDrivers,
  };
}
