import { createAdminClient } from "@/lib/supabase/admin";

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return Number(sorted[index].toFixed(2));
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

export async function updateCategoryBenchmarks() {
  const supabase = createAdminClient();

  const [{ data: agents, error: agentsError }, { data: weeklyStats, error: statsError }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, categories, avg_rating, avg_response_time_ms, completion_rate"),
    supabase
      .from("agent_daily_stats")
      .select("agent_id, tasks_completed, stat_date")
      .gte("stat_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ]);

  if (agentsError) {
    throw new Error(`Failed to load agents for category benchmarks: ${agentsError.message}`);
  }

  if (statsError) {
    throw new Error(`Failed to load weekly stats for category benchmarks: ${statsError.message}`);
  }

  const benchmarkMap = new Map<
    string,
    {
      ratings: number[];
      responseTimes: number[];
      completionRates: number[];
      weeklyTaskCounts: number[];
    }
  >();

  for (const agent of agents ?? []) {
    const weeklyTaskCount = (weeklyStats ?? [])
      .filter((stat) => stat.agent_id === agent.id)
      .reduce((sum, stat) => sum + Number(stat.tasks_completed ?? 0), 0);

    for (const category of agent.categories ?? []) {
      const bucket =
        benchmarkMap.get(category) ??
        {
          ratings: [],
          responseTimes: [],
          completionRates: [],
          weeklyTaskCounts: [],
        };

      bucket.ratings.push(Number(agent.avg_rating ?? 0));
      bucket.responseTimes.push(Number(agent.avg_response_time_ms ?? 0));
      bucket.completionRates.push(Number(agent.completion_rate ?? 0));
      bucket.weeklyTaskCounts.push(weeklyTaskCount);
      benchmarkMap.set(category, bucket);
    }
  }

  const benchmarks = Object.fromEntries(
    Array.from(benchmarkMap.entries()).map(([category, bucket]) => [
      category,
      {
        avg_rating_median: median(bucket.ratings),
        avg_response_time_ms_median: median(bucket.responseTimes),
        completion_rate_median: median(bucket.completionRates),
        weekly_task_count_p25: percentile(bucket.weeklyTaskCounts, 0.25),
        weekly_task_count_p50: percentile(bucket.weeklyTaskCounts, 0.5),
        weekly_task_count_p75: percentile(bucket.weeklyTaskCounts, 0.75),
      },
    ]),
  );

  await supabase.from("platform_config").upsert(
    {
      key: "category_benchmarks",
      value: benchmarks,
      description: "Category benchmark cache for seller dashboards.",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "key",
    },
  );

  return benchmarks;
}
