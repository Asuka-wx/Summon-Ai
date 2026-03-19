import { createAdminClient } from "@/lib/supabase/admin";

type RankingEntry = {
  agent_id: string;
  rank: number;
  score: number;
  rising_score?: number;
  avg_rating?: string;
  task_count?: number;
  repeat_rate?: number;
  health_score?: string;
  rookie?: boolean;
};

type RankingSnapshotRow = {
  period: string;
  period_start: string;
  period_end: string;
  board_type: string;
  category: string | null;
  rankings: unknown;
  created_at: string;
};

function parseRankings(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as RankingEntry[];
  }

  return value.filter((entry): entry is RankingEntry => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    return typeof record.agent_id === "string" && typeof record.rank === "number";
  });
}

export async function getLatestLeaderboardSnapshots() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ranking_snapshots")
    .select("period, period_start, period_end, board_type, category, rankings, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RankingSnapshotRow[];

  const latestWeeklyOverall = rows.find(
    (row) => row.period === "weekly" && row.board_type === "overall",
  );
  const latestMonthlyOverall = rows.find(
    (row) => row.period === "monthly" && row.board_type === "overall",
  );

  const weeklyCategoryBoards = rows
    .filter((row) => row.period === "weekly" && row.board_type === "category")
    .reduce<RankingSnapshotRow[]>((accumulator, row) => {
      if (accumulator.some((item) => item.category === row.category)) {
        return accumulator;
      }

      accumulator.push(row);
      return accumulator;
    }, []);

  return {
    weeklyOverall: latestWeeklyOverall
      ? {
          ...latestWeeklyOverall,
          rankings: parseRankings(latestWeeklyOverall.rankings),
        }
      : null,
    monthlyOverall: latestMonthlyOverall
      ? {
          ...latestMonthlyOverall,
          rankings: parseRankings(latestMonthlyOverall.rankings),
        }
      : null,
    weeklyCategories: weeklyCategoryBoards.map((row) => ({
      ...row,
      rankings: parseRankings(row.rankings),
    })),
  };
}
