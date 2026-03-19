import { createAdminClient } from "@/lib/supabase/admin";

function toNumber(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

const DEFAULT_QUALITY_CONTROL = {
  warn_threshold: toNumber(process.env.QUALITY_WARN_THRESHOLD, 60),
  failure_rate_threshold: toNumber(process.env.QUALITY_FAILURE_RATE_THRESHOLD, 0.2),
  observe_weeks: toNumber(process.env.QUALITY_OBSERVE_WEEKS, 3),
  min_tasks: toNumber(process.env.QUALITY_MIN_TASKS, 10),
  recovery_weeks: toNumber(process.env.QUALITY_RECOVERY_WEEKS, 2),
  recovery_threshold: toNumber(process.env.QUALITY_RECOVERY_THRESHOLD, 80),
  auto_pause_health_threshold: toNumber(process.env.QUALITY_WARN_THRESHOLD, 60),
  newbie_protection_tasks: 5,
  small_sample_base_score: 80,
  small_sample_min_tasks: 5,
} as const;

const DEFAULT_DISPLAY_THRESHOLDS = {
  showcase_min_agents_per_section: 3,
  showcase_hot_min_completed_tasks: 1,
  showcase_top_min_ratings: 5,
  showcase_rising_min_ratings: 5,
  leaderboard_min_entries: 3,
  leaderboard_overall_min_tasks: 5,
  leaderboard_category_min_tasks: 3,
  leaderboard_rookie_max_days: 30,
} as const;

export async function getQualityControlConfig() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "quality_control")
    .maybeSingle();

  const stored = (data?.value ?? {}) as Record<string, unknown>;

  return {
    ...DEFAULT_QUALITY_CONTROL,
    ...stored,
    warn_threshold: toNumber(
      stored.warn_threshold ?? stored.downgrade_health_threshold,
      DEFAULT_QUALITY_CONTROL.warn_threshold,
    ),
    failure_rate_threshold: toNumber(
      stored.failure_rate_threshold,
      DEFAULT_QUALITY_CONTROL.failure_rate_threshold,
    ),
    observe_weeks: toNumber(
      stored.observe_weeks ?? stored.downgrade_weeks,
      DEFAULT_QUALITY_CONTROL.observe_weeks,
    ),
    min_tasks: toNumber(
      stored.min_tasks ?? stored.downgrade_min_tasks,
      DEFAULT_QUALITY_CONTROL.min_tasks,
    ),
    recovery_weeks: toNumber(
      stored.recovery_weeks ?? stored.upgrade_weeks_demoted_to_warned,
      DEFAULT_QUALITY_CONTROL.recovery_weeks,
    ),
    recovery_threshold: toNumber(
      stored.recovery_threshold ?? stored.upgrade_health_threshold,
      DEFAULT_QUALITY_CONTROL.recovery_threshold,
    ),
    auto_pause_health_threshold: toNumber(
      stored.auto_pause_health_threshold ?? stored.warn_threshold ?? stored.downgrade_health_threshold,
      DEFAULT_QUALITY_CONTROL.auto_pause_health_threshold,
    ),
    newbie_protection_tasks: toNumber(
      stored.newbie_protection_tasks,
      DEFAULT_QUALITY_CONTROL.newbie_protection_tasks,
    ),
    small_sample_base_score: toNumber(
      stored.small_sample_base_score,
      DEFAULT_QUALITY_CONTROL.small_sample_base_score,
    ),
    small_sample_min_tasks: toNumber(
      stored.small_sample_min_tasks,
      DEFAULT_QUALITY_CONTROL.small_sample_min_tasks,
    ),
  };
}

export async function getDisplayThresholdsConfig() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "display_thresholds")
    .maybeSingle();

  return {
    ...DEFAULT_DISPLAY_THRESHOLDS,
    ...(data?.value ?? {}),
  };
}
