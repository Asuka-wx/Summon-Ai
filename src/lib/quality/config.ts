import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_QUALITY_CONTROL = {
  downgrade_weeks: 3,
  downgrade_min_tasks: 10,
  downgrade_health_threshold: 60,
  upgrade_weeks_hidden_to_demoted: 2,
  upgrade_weeks_demoted_to_warned: 2,
  upgrade_weeks_warned_to_normal: 1,
  upgrade_min_tasks: 5,
  upgrade_health_threshold: 80,
  auto_pause_health_threshold: 60,
  newbie_protection_tasks: 5,
  small_sample_base_score: 80,
  small_sample_min_tasks: 5,
  failure_rate_threshold: 0.2,
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

  return {
    ...DEFAULT_QUALITY_CONTROL,
    ...(data?.value ?? {}),
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
