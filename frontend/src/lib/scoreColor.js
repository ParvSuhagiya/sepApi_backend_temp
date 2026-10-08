/**
 * EarnScore colour thresholds. Always paired with the numeric score and the
 * word "EarnScore", so colour is never the only signal.
 */
export function scoreColor(score) {
  const value = Number(score);
  if (value >= 75) return "green";
  if (value >= 55) return "amber";
  return "red";
}
