export function getNextConcurrencyThreshold(level: number) {
  switch (level) {
    case 1:
      return 5;
    case 2:
      return 15;
    case 3:
      return 30;
    case 4:
      return 50;
    default:
      return null;
  }
}

export function getConcurrencyHealthThreshold() {
  return Number(process.env.CONCURRENCY_HEALTH_THRESHOLD ?? 80);
}

export function getConcurrencyFaultThreshold() {
  return Number(process.env.CONCURRENCY_FAULT_THRESHOLD ?? 0.1);
}

export function getConcurrencyObservationWindow() {
  return Number(process.env.CONCURRENCY_OBSERVATION_WINDOW ?? 10);
}

export function getConcurrencyDowngradeHealth() {
  return Number(process.env.CONCURRENCY_DOWNGRADE_HEALTH ?? 60);
}

export function shouldUpgradeConcurrency({
  level,
  totalCompletedTasks,
  healthScore,
  faultRate,
}: {
  level: number;
  totalCompletedTasks: number;
  healthScore: number;
  faultRate: number;
}) {
  const nextThreshold = getNextConcurrencyThreshold(level);

  return Boolean(
    nextThreshold !== null &&
      totalCompletedTasks >= nextThreshold &&
      healthScore >= getConcurrencyHealthThreshold() &&
      faultRate < getConcurrencyFaultThreshold(),
  );
}

export function shouldDowngradeConcurrency({
  observationTaskCount,
  recentHealthScore,
}: {
  observationTaskCount: number;
  recentHealthScore: number;
}) {
  return (
    observationTaskCount >= getConcurrencyObservationWindow() &&
    recentHealthScore < getConcurrencyDowngradeHealth()
  );
}
