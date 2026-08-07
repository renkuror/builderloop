export const MAX_LOYALTY_SCORE = 1_000;

export function deriveEffectiveLoyalty(policy, state, nowSeconds = Math.floor(Date.now() / 1_000)) {
  if (!policy || !state) return undefined;
  const elapsed = nowSeconds - state.lastMeaningfulActivityAt;
  if (!Number.isSafeInteger(elapsed) || elapsed < 0 || policy.heartbeatSeconds <= 0) return undefined;
  const elapsedPeriods = Math.floor(elapsed / policy.heartbeatSeconds);
  const missedPeriods = Math.max(0, elapsedPeriods - 1);
  const decay = BigInt(missedPeriods) * BigInt(policy.decayPerMissedPeriod);
  const rawScore = BigInt(state.scoreAtLastSettlement) - decay;
  const effectiveScore = Number(rawScore > 0n ? rawScore : 0n);
  const nextDecayAt = state.lastMeaningfulActivityAt + policy.heartbeatSeconds * 2;
  return {
    effectiveScore,
    effectiveStreak: missedPeriods === 0 ? state.streak : 0,
    elapsedPeriods,
    missedPeriods,
    nextDecayAt,
    tier: tierForScore(effectiveScore, policy),
  };
}

export function tierForScore(score, policy) {
  if (score >= policy.platinumThreshold) return "PLATINUM";
  if (score >= policy.goldThreshold) return "GOLD";
  if (score >= policy.silverThreshold) return "SILVER";
  return "BRONZE";
}

export function formatCountdown(seconds) {
  if (!Number.isFinite(seconds)) return "UNAVAILABLE";
  if (seconds <= 0) return "DUE NOW";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3_600);
  const minutes = Math.floor((whole % 3_600) / 60);
  const remainder = whole % 60;
  if (hours > 0) return `${hours}H ${minutes}M`;
  if (minutes > 0) return `${minutes}M ${remainder}S`;
  return `${remainder}S`;
}

export function formatHeartbeat(seconds) {
  if (seconds % 86_400 === 0) return `${seconds / 86_400} DAY${seconds === 86_400 ? "" : "S"}`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600} HOUR${seconds === 3_600 ? "" : "S"}`;
  if (seconds % 60 === 0) return `${seconds / 60} MINUTE${seconds === 60 ? "" : "S"}`;
  return `${seconds} SECONDS`;
}
