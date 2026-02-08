// lib/ml/logreg.ts
// Minimal logistic regression (binary classification) with L2 regularization.
// Runs on-device (TypeScript), small datasets only.

export type LogRegModel = {
  featureNames: string[];
  weights: number[]; // length = nFeatures
  bias: number;
  trainedAt: string; // ISO
};

function sigmoid(z: number) {
  // Clamp to avoid overflow
  const x = Math.max(-35, Math.min(35, z));
  return 1 / (1 + Math.exp(-x));
}

export function predictProba(model: Pick<LogRegModel, "weights" | "bias">, x: number[]): number {
  let z = model.bias;
  for (let i = 0; i < model.weights.length; i++) z += model.weights[i] * x[i];
  return sigmoid(z);
}

export type TrainLogRegOptions = {
  steps?: number; // gradient descent steps
  lr?: number; // learning rate
  l2?: number; // L2 strength
};

export function trainLogReg(
  X: number[][],
  y: number[],
  featureNames: string[],
  opts: TrainLogRegOptions = {}
): LogRegModel {
  const n = X.length;
  if (!n) throw new Error("No training rows");
  const d = featureNames.length;
  const steps = opts.steps ?? 800;
  const lr = opts.lr ?? 0.1;
  const l2 = opts.l2 ?? 0.02;

  let w = new Array(d).fill(0);
  let b = 0;

  for (let step = 0; step < steps; step++) {
    // gradients
    let gb = 0;
    const gw = new Array(d).fill(0);

    for (let i = 0; i < n; i++) {
      const p = predictProba({ weights: w, bias: b }, X[i]);
      const err = p - y[i];
      gb += err;
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
    }

    // average + L2
    gb /= n;
    for (let j = 0; j < d; j++) {
      gw[j] = gw[j] / n + l2 * w[j];
    }

    // update
    b -= lr * gb;
    for (let j = 0; j < d; j++) w[j] -= lr * gw[j];
  }

  return {
    featureNames,
    weights: w,
    bias: b,
    trainedAt: new Date().toISOString(),
  };
}
