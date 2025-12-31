export function isBalanceDrop(todayLbi: number, baselineLbi: number | null): boolean {
  if (baselineLbi === null) return false;
  return todayLbi < baselineLbi * 0.85;
}
