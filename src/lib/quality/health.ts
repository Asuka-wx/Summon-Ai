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

export function resolveNextQualityStatus({
  currentStatus,
  healthScore,
  observationWeeks,
  observedTaskCount,
  downgradeWeeks,
  downgradeMinTasks,
  downgradeHealthThreshold,
  upgradeWeeksHiddenToDemoted,
  upgradeWeeksDemotedToWarned,
  upgradeWeeksWarnedToNormal,
  upgradeMinTasks,
  upgradeHealthThreshold,
}: {
  currentStatus: QualityStatus;
  healthScore: number;
  observationWeeks: number;
  observedTaskCount: number;
  downgradeWeeks: number;
  downgradeMinTasks: number;
  downgradeHealthThreshold: number;
  upgradeWeeksHiddenToDemoted: number;
  upgradeWeeksDemotedToWarned: number;
  upgradeWeeksWarnedToNormal: number;
  upgradeMinTasks: number;
  upgradeHealthThreshold: number;
}) {
  const canDowngrade =
    observationWeeks >= downgradeWeeks &&
    observedTaskCount >= downgradeMinTasks &&
    healthScore < downgradeHealthThreshold;
  const canUpgrade =
    observedTaskCount >= upgradeMinTasks && healthScore >= upgradeHealthThreshold;

  if (currentStatus === "normal" && canDowngrade) {
    return "warned";
  }

  if (currentStatus === "warned") {
    if (
      canUpgrade &&
      observationWeeks >= upgradeWeeksWarnedToNormal
    ) {
      return "normal";
    }

    if (canDowngrade) {
      return "demoted";
    }
  }

  if (currentStatus === "demoted") {
    if (
      canUpgrade &&
      observationWeeks >= upgradeWeeksDemotedToWarned
    ) {
      return "warned";
    }

    if (canDowngrade) {
      return "hidden";
    }
  }

  if (
    currentStatus === "hidden" &&
    canUpgrade &&
    observationWeeks >= upgradeWeeksHiddenToDemoted
  ) {
    return "demoted";
  }

  if (
    currentStatus === "recovery_pending" &&
    canUpgrade &&
    observationWeeks >= 4
  ) {
    return "demoted";
  }

  return currentStatus;
}
