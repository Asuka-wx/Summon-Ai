import { getQualityMultiplier, type QualityStatus } from "@/lib/quality/health";

export function calculateBidRank({
  confidence,
  avgRating,
  pricePerCall,
  maxPriceInBatch,
  avgResponseTimeMs,
  qualityStatus,
  totalTasks,
  platformAverageRating,
}: {
  confidence: "high" | "medium" | "low";
  avgRating: number;
  pricePerCall: number;
  maxPriceInBatch: number;
  avgResponseTimeMs: number;
  qualityStatus: QualityStatus;
  totalTasks: number;
  platformAverageRating: number;
}) {
  const matchScore =
    confidence === "high" ? 1 : confidence === "medium" ? 0.6 : 0.3;

  const speedScore =
    avgResponseTimeMs === 0
      ? 0.5
      : Math.max(0, Math.min(1, 1 - avgResponseTimeMs / 8000));

  const effectiveRating =
    totalTasks < 5 ? platformAverageRating : avgRating;
  const ratingScore = Math.max(0, Math.min(1, effectiveRating / 5));
  const priceScore =
    maxPriceInBatch === 0
      ? 1
      : Math.max(0, Math.min(1, 1 - pricePerCall / maxPriceInBatch));

  const bidRank =
    matchScore * 0.4 +
    speedScore * 0.3 +
    ratingScore * 0.2 +
    priceScore * 0.1;

  return Number((bidRank * getQualityMultiplier(qualityStatus)).toFixed(4));
}

export function calculateRisingScore({
  avgRating7d,
  avgRating30d,
  tasks7d,
  health7d,
  health30d,
}: {
  avgRating7d: number;
  avgRating30d: number;
  tasks7d: number;
  health7d: number;
  health30d: number;
}) {
  return Number(
    (
      (avgRating7d - avgRating30d) * 0.5 +
      Math.log(tasks7d + 1) * 0.3 +
      (health7d - health30d) * 0.2
    ).toFixed(4),
  );
}

export function calculateLeaderboardScore({
  avgRating,
  taskCount,
  maxTaskCountInPeriod,
  healthScore,
  repeatRate,
}: {
  avgRating: number;
  taskCount: number;
  maxTaskCountInPeriod: number;
  healthScore: number;
  repeatRate: number;
}) {
  const normalizedTaskCount =
    maxTaskCountInPeriod > 0 ? Math.min(taskCount / maxTaskCountInPeriod, 1) : 0;

  return Number(
    (
      (avgRating / 5) * 0.4 +
      normalizedTaskCount * 0.3 +
      (healthScore / 100) * 0.2 +
      repeatRate * 0.1
    ).toFixed(4),
  );
}

export function shouldShowShowcaseSection(totalCount: number, minAgents: number) {
  return totalCount >= minAgents;
}

export function shouldShowLeaderboard(entries: number, minEntries: number) {
  return entries >= minEntries;
}
