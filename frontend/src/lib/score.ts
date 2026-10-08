export type ScoreTone = 'green' | 'amber' | 'red';

/**
 * Score colour thresholds: >= 75 green, >= 55 amber, else red.
 * Always paired with the numeric score and a text label elsewhere,
 * so colour is never the only signal.
 *
 * Ported verbatim from the previous frontend (behavior pinned by tests).
 */
export function scoreColor(score: number): ScoreTone {
  const value = Number(score);
  if (value >= 75) return 'green';
  if (value >= 55) return 'amber';
  return 'red';
}
