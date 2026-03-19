export function getRatingWeight({
  isSeedTask,
  isNewUser,
  triggeredAnomaly,
}: {
  isSeedTask: boolean;
  isNewUser: boolean;
  triggeredAnomaly: boolean;
}) {
  const candidates = [
    1.0,
    isSeedTask ? 0.7 : 1.0,
    isNewUser ? 0.5 : 1.0,
    triggeredAnomaly ? 0.3 : 1.0,
  ];

  return Math.min(...candidates);
}

export function calculateWeightedAverageRating(
  ratings: Array<{
    rating: number;
    user_weight: number;
  }>,
) {
  if (ratings.length === 0) {
    return 0;
  }

  const weightedSum = ratings.reduce(
    (sum, item) => sum + Number(item.rating ?? 0) * Number(item.user_weight ?? 1),
    0,
  );
  const totalWeight = ratings.reduce(
    (sum, item) => sum + Number(item.user_weight ?? 1),
    0,
  );

  if (totalWeight === 0) {
    return 0;
  }

  return Number((weightedSum / totalWeight).toFixed(2));
}

export function calculateAgentScore({
  avgRating,
  completionRate,
}: {
  avgRating: number;
  completionRate: number;
}) {
  return Number((((avgRating / 5) * 0.5 + completionRate * 0.5)).toFixed(4));
}
