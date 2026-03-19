export type QualityStatus =
  | "normal"
  | "warned"
  | "demoted"
  | "hidden"
  | "recovery_pending";

export function calculateHealthScoreRaw({
  uptimeScore,
  responseScore,
  completionScore,
  cancelScore,
  reportScore,
}: {
  uptimeScore: number;
  responseScore: number;
  completionScore: number;
  cancelScore: number;
  reportScore: number;
}) {
  return Number(
    (
      uptimeScore * 0.3 +
      responseScore * 0.25 +
      completionScore * 0.25 +
      cancelScore * 0.1 +
      reportScore * 0.1
    ).toFixed(2),
  );
}

export function applyNewbieAndSmallSampleProtection({
  totalTasks,
  sevenDayTaskCount,
  rawHealthScore,
  newbieProtectionTasks,
  smallSampleBaseScore,
  smallSampleMinTasks,
}: {
  totalTasks: number;
  sevenDayTaskCount: number;
  rawHealthScore: number;
  newbieProtectionTasks: number;
  smallSampleBaseScore: number;
  smallSampleMinTasks: number;
}) {
  if (totalTasks < newbieProtectionTasks) {
    return 100;
  }

  if (sevenDayTaskCount >= smallSampleMinTasks) {
    return rawHealthScore;
  }

  return Number(
    (
      (sevenDayTaskCount / smallSampleMinTasks) * rawHealthScore +
      (1 - sevenDayTaskCount / smallSampleMinTasks) * smallSampleBaseScore
    ).toFixed(2),
  );
}

export function getQualityMultiplier(qualityStatus: QualityStatus) {
  switch (qualityStatus) {
    case "demoted":
      return 0.5;
    case "recovery_pending":
      return 0.5;
    case "hidden":
      return 0;
    case "warned":
    case "normal":
    default:
      return 1;
  }
}

export function hasQualityWarningTrigger({
  healthScore,
  failureRate,
  warnThreshold,
  failureRateThreshold,
}: {
  healthScore: number;
  failureRate: number;
  warnThreshold: number;
  failureRateThreshold: number;
}) {
  return healthScore < warnThreshold || failureRate > failureRateThreshold;
}

export function resolveNextQualityStatus({
  currentStatus,
  healthScore,
  failureRate,
  weeksSinceChange,
  tasksSinceChange,
  warnThreshold,
  failureRateThreshold,
  observeWeeks,
  minTasks,
  recoveryWeeks,
  recoveryThreshold,
}: {
  currentStatus: QualityStatus;
  healthScore: number;
  failureRate: number;
  weeksSinceChange: number;
  tasksSinceChange: number;
  warnThreshold: number;
  failureRateThreshold: number;
  observeWeeks: number;
  minTasks: number;
  recoveryWeeks: number;
  recoveryThreshold: number;
}) {
  const warningTriggered = hasQualityWarningTrigger({
    healthScore,
    failureRate,
    warnThreshold,
    failureRateThreshold,
  });
  const canChangeByObservation =
    weeksSinceChange >= observeWeeks && tasksSinceChange >= minTasks;
  const canRecover =
    weeksSinceChange >= recoveryWeeks &&
    tasksSinceChange >= minTasks &&
    healthScore >= recoveryThreshold;

  if (currentStatus === "normal" && warningTriggered) {
    return "warned";
  }

  if (currentStatus === "warned") {
    if (warningTriggered && canChangeByObservation) {
      return "demoted";
    }

    if (!warningTriggered && canRecover) {
      return "normal";
    }
  }

  if (currentStatus === "demoted") {
    if (warningTriggered && canChangeByObservation) {
      return "hidden";
    }

    if (!warningTriggered && canRecover) {
      return "warned";
    }
  }

  if (currentStatus === "hidden" && canRecover) {
    return "demoted";
  }

  return currentStatus;
}
