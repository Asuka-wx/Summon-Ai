import { sendNotification } from "@/lib/notifications/service";
import { createAdminClient } from "@/lib/supabase/admin";

type BadgeCode =
  | "pioneer"
  | "rising_star"
  | "well_rated"
  | "zero_fault"
  | "ironman"
  | "precise_match"
  | "repeat_king"
  | "evolving"
  | "hot_creator"
  | "thousand_club"
  | "versatile"
  | "diamond"
  | "top_regular"
  | "ten_thousand_club"
  | "first_task"
  | "veteran"
  | "quality_reviewer"
  | "scout"
  | "big_spender"
  | "tipper";

type AgentRow = {
  id: string;
  owner_id: string;
  categories: string[] | null;
  status: string | null;
  created_at: string;
  avg_rating: number | null;
  rating_count: number | null;
  total_tasks: number | null;
  health_score: number | null;
  total_earnings: number | null;
  total_tips: number | null;
};

type TaskRow = {
  id: string;
  user_id: string;
  agent_id: string;
  status: string | null;
  phase: string | null;
  is_seed_task: boolean | null;
  is_direct: boolean | null;
  is_test: boolean | null;
  created_at: string;
  completed_at: string | null;
};

type RatingRow = {
  task_id: string;
  user_id: string;
  agent_id: string;
  comment: string | null;
};

type PaymentRow = {
  from_user_id: string;
  type: string;
  amount: number | null;
  status: string | null;
};

type DailyStatRow = {
  agent_id: string;
  stat_date: string;
  online_seconds: number | null;
  health_score_snapshot: number | null;
};

type RankingSnapshotRow = {
  period: string;
  board_type: string;
  rankings: unknown;
};

type RankingEntry = {
  agent_id: string;
  rank: number;
};

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function groupBy<TItem, TKey extends string>(items: TItem[], getKey: (item: TItem) => TKey) {
  const grouped = new Map<TKey, TItem[]>();

  for (const item of items) {
    const key = getKey(item);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  return grouped;
}

function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTrailingUtcDates(days: number) {
  const dates: string[] = [];
  const cursor = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const current = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() - offset),
    );
    dates.unshift(getUtcDateKey(current));
  }

  return dates;
}

function getUtcWeekKey(value: string) {
  const date = new Date(value);
  const midnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = midnight.getUTCDay() || 7;
  midnight.setUTCDate(midnight.getUTCDate() - day + 1);
  return midnight.toISOString().slice(0, 10);
}

function parseRankings(rankings: unknown): RankingEntry[] {
  if (!Array.isArray(rankings)) {
    return [];
  }

  return rankings
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const agentId = String(record.agent_id ?? "");
      const rank = toNumber(record.rank, 0);

      if (!agentId || rank <= 0) {
        return null;
      }

      return {
        agent_id: agentId,
        rank,
      };
    })
    .filter((entry): entry is RankingEntry => entry !== null);
}

async function getBadgeIdMap() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("badges").select("id, code");

  if (error) {
    throw new Error(`Failed to load badges: ${error.message}`);
  }

  return new Map((data ?? []).map((badge) => [badge.code, badge.id]));
}

async function getEarnedBadgeCodes(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_badges")
    .select("badge_id, badges(code)")
    .eq("user_id", userId);

  return new Set(
    (data ?? [])
      .map((row) => (row as { badges?: { code?: string } }).badges?.code)
      .filter(Boolean) as string[],
  );
}

async function awardBadge({
  badgeCode,
  userId,
  badgeIdMap,
}: {
  badgeCode: BadgeCode;
  userId: string;
  badgeIdMap: Map<string, string>;
}) {
  const badgeId = badgeIdMap.get(badgeCode);
  if (!badgeId) {
    return false;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("user_badges").insert({
    user_id: userId,
    badge_id: badgeId,
  });

  if (error) {
    return false;
  }

  void sendNotification(userId, "badge_unlocked", {
    badge_id: badgeId,
    badge_code: badgeCode,
  });

  return true;
}

function buildSupplierLaunchOrder(agents: AgentRow[]) {
  const firstSeenOwnerIds = new Set<string>();
  const orderedOwnerIds: string[] = [];

  [...agents]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .forEach((agent) => {
      if (!firstSeenOwnerIds.has(agent.owner_id)) {
        firstSeenOwnerIds.add(agent.owner_id);
        orderedOwnerIds.push(agent.owner_id);
      }
    });

  return orderedOwnerIds;
}

export async function runBadgeScan() {
  const supabase = createAdminClient();
  const badgeIdMap = await getBadgeIdMap();
  const awarded: Array<{ user_id: string; badge_code: BadgeCode }> = [];

  const [
    { data: agentsData, error: agentsError },
    { data: tasksData, error: tasksError },
    { data: ratingsData, error: ratingsError },
    { data: paymentsData, error: paymentsError },
    { data: dailyStatsData, error: dailyStatsError },
    { data: rankingSnapshotsData, error: rankingSnapshotsError },
    { data: faultMessagesData, error: faultMessagesError },
  ] = await Promise.all([
    supabase
      .from("agents")
      .select(
        "id, owner_id, categories, status, created_at, avg_rating, rating_count, total_tasks, health_score, total_earnings, total_tips",
      ),
    supabase
      .from("tasks")
      .select(
        "id, user_id, agent_id, status, phase, is_seed_task, is_direct, is_test, created_at, completed_at",
      ),
    supabase.from("ratings").select("task_id, user_id, agent_id, comment"),
    supabase.from("payments").select("from_user_id, type, amount, status"),
    supabase.from("agent_daily_stats").select("agent_id, stat_date, online_seconds, health_score_snapshot"),
    supabase.from("ranking_snapshots").select("period, board_type, rankings"),
    supabase.from("task_messages").select("task_id").eq("is_fault", true),
  ]);

  if (agentsError) {
    throw new Error(`Failed to load agents for badge scan: ${agentsError.message}`);
  }

  if (tasksError) {
    throw new Error(`Failed to load tasks for badge scan: ${tasksError.message}`);
  }

  if (ratingsError) {
    throw new Error(`Failed to load ratings for badge scan: ${ratingsError.message}`);
  }

  if (paymentsError) {
    throw new Error(`Failed to load payments for badge scan: ${paymentsError.message}`);
  }

  if (dailyStatsError) {
    throw new Error(`Failed to load agent daily stats for badge scan: ${dailyStatsError.message}`);
  }

  if (rankingSnapshotsError) {
    throw new Error(`Failed to load ranking snapshots for badge scan: ${rankingSnapshotsError.message}`);
  }

  if (faultMessagesError) {
    throw new Error(`Failed to load fault task messages for badge scan: ${faultMessagesError.message}`);
  }

  const agents = (agentsData ?? []) as AgentRow[];
  const tasks = ((tasksData ?? []) as TaskRow[]).filter((task) => !task.is_test);
  const taskIds = new Set(tasks.map((task) => task.id));
  const ratings = ((ratingsData ?? []) as RatingRow[]).filter((rating) => taskIds.has(rating.task_id));
  const payments = (paymentsData ?? []) as PaymentRow[];
  const dailyStats = (dailyStatsData ?? []) as DailyStatRow[];
  const rankingSnapshots = (rankingSnapshotsData ?? []) as RankingSnapshotRow[];
  const faultTaskIds = new Set((faultMessagesData ?? []).map((row) => String(row.task_id)));
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const tasksByAgent = groupBy(tasks, (task) => task.agent_id);
  const completedTasksByAgent = groupBy(completedTasks, (task) => task.agent_id);
  const completedTasksByUser = groupBy(completedTasks, (task) => task.user_id);
  const agentsByOwner = groupBy(agents, (agent) => agent.owner_id);
  const ratingsByUser = groupBy(ratings, (rating) => rating.user_id);
  const dailyStatsByAgent = groupBy(dailyStats, (stat) => stat.agent_id);
  const supplierLaunchOrder = buildSupplierLaunchOrder(agents);
  const supplierOwnerIds = supplierLaunchOrder.filter((ownerId, index) => {
    const ownerAgents = agentsByOwner.get(ownerId) ?? [];
    return ownerAgents.some((agent) => agent.status !== "archived") && index < 50;
  });
  const topPioneerOwners = new Set(supplierOwnerIds);
  const weeklyOverallRankings = rankingSnapshots
    .filter((snapshot) => snapshot.period === "weekly" && snapshot.board_type === "overall")
    .map((snapshot) => parseRankings(snapshot.rankings));
  const monthlyOverallRankings = rankingSnapshots
    .filter((snapshot) => snapshot.period === "monthly" && snapshot.board_type === "overall")
    .map((snapshot) => parseRankings(snapshot.rankings));
  const trailingThirtyDates = getTrailingUtcDates(30);

  for (const [ownerId, ownerAgents] of agentsByOwner.entries()) {
    const earned = await getEarnedBadgeCodes(ownerId);
    const ownerAgentIds = new Set(ownerAgents.map((agent) => agent.id));
    const ownerCompletedTasks = completedTasks.filter((task) => ownerAgentIds.has(task.agent_id));
    const ownerIncome = ownerAgents.reduce(
      (total, agent) => total + toNumber(agent.total_earnings) + toNumber(agent.total_tips),
      0,
    );

    const supplierBadgeChecks: Array<{ code: BadgeCode; eligible: boolean }> = [
      {
        code: "pioneer",
        eligible: topPioneerOwners.has(ownerId),
      },
      {
        code: "rising_star",
        eligible: ownerAgents.some((agent) => {
          const sevenDayCutoff = new Date(agent.created_at).getTime() + 7 * 24 * 60 * 60 * 1000;
          const completedWithinWindow = ownerCompletedTasks.filter(
            (task) =>
              task.agent_id === agent.id && new Date(task.created_at).getTime() <= sevenDayCutoff,
          );

          return completedWithinWindow.length >= 10;
        }),
      },
      {
        code: "well_rated",
        eligible: ownerAgents.some(
          (agent) => toNumber(agent.avg_rating) >= 4.5 && toNumber(agent.rating_count) >= 20,
        ),
      },
      {
        code: "zero_fault",
        eligible: ownerAgents.some((agent) => {
          const recentCompleted = [...(completedTasksByAgent.get(agent.id) ?? [])]
            .sort(
              (left, right) =>
                new Date(right.completed_at ?? right.created_at).getTime() -
                new Date(left.completed_at ?? left.created_at).getTime(),
            )
            .slice(0, 50);

          return (
            (completedTasksByAgent.get(agent.id)?.length ?? 0) >= 50 &&
            recentCompleted.every((task) => !faultTaskIds.has(task.id))
          );
        }),
      },
      {
        code: "ironman",
        eligible: ownerAgents.some((agent) => {
          const dailyMap = new Map(
            (dailyStatsByAgent.get(agent.id) ?? []).map((stat) => [stat.stat_date, toNumber(stat.online_seconds)]),
          );

          return trailingThirtyDates.every((dateKey) => (dailyMap.get(dateKey) ?? 0) >= 28_800);
        }),
      },
      {
        code: "precise_match",
        eligible: ownerAgents.some((agent) => {
          const candidateTasks = (tasksByAgent.get(agent.id) ?? []).filter(
            (task) => !task.is_seed_task && !task.is_direct,
          );
          const convertedCount = candidateTasks.filter(
            (task) => task.phase === "paid" || task.status === "completed",
          ).length;

          return candidateTasks.length >= 20 && convertedCount / candidateTasks.length >= 0.8;
        }),
      },
      {
        code: "repeat_king",
        eligible: ownerAgents.some((agent) => {
          const candidateTasks = (completedTasksByAgent.get(agent.id) ?? []).filter(
            (task) => !task.is_seed_task,
          );
          const directCount = candidateTasks.filter((task) => task.is_direct).length;

          return candidateTasks.length >= 30 && directCount / candidateTasks.length >= 0.5;
        }),
      },
      {
        code: "evolving",
        eligible: ownerAgents.some((agent) => {
          const weeklyHealth = Array.from(
            (dailyStatsByAgent.get(agent.id) ?? []).reduce((accumulator, stat) => {
              if (!stat.health_score_snapshot) {
                return accumulator;
              }

              const weekKey = getUtcWeekKey(stat.stat_date);
              const current = accumulator.get(weekKey) ?? [];
              current.push(toNumber(stat.health_score_snapshot));
              accumulator.set(weekKey, current);
              return accumulator;
            }, new Map<string, number[]>()),
          )
            .map(([weekKey, scores]) => ({
              weekKey,
              average: sum(scores) / Math.max(1, scores.length),
            }))
            .sort((left, right) => left.weekKey.localeCompare(right.weekKey))
            .slice(-4);

          return (
            weeklyHealth.length === 4 &&
            weeklyHealth[0].average < weeklyHealth[1].average &&
            weeklyHealth[1].average < weeklyHealth[2].average &&
            weeklyHealth[2].average < weeklyHealth[3].average
          );
        }),
      },
      {
        code: "hot_creator",
        eligible: monthlyOverallRankings.some((ranking) =>
          ranking.some(
            (entry) => ownerAgentIds.has(entry.agent_id) && entry.rank <= 10,
          ),
        ),
      },
      {
        code: "thousand_club",
        eligible: ownerIncome >= 1_000,
      },
      {
        code: "versatile",
        eligible: (() => {
          const qualifiedCategories = new Set<string>();

          for (const agent of ownerAgents) {
            if (toNumber(agent.rating_count) < 5 || toNumber(agent.avg_rating) < 4) {
              continue;
            }

            for (const category of agent.categories ?? []) {
              qualifiedCategories.add(category);
            }
          }

          return qualifiedCategories.size >= 3;
        })(),
      },
      {
        code: "diamond",
        eligible: ownerAgents.some(
          (agent) =>
            toNumber(agent.avg_rating) >= 4.8 &&
            toNumber(agent.total_tasks) >= 100 &&
            toNumber(agent.health_score) >= 90,
        ),
      },
      {
        code: "top_regular",
        eligible:
          weeklyOverallRankings.filter((ranking) =>
            ranking.some((entry) => ownerAgentIds.has(entry.agent_id) && entry.rank <= 3),
          ).length >= 4,
      },
      {
        code: "ten_thousand_club",
        eligible: ownerIncome >= 10_000,
      },
    ];

    for (const check of supplierBadgeChecks) {
      if (!earned.has(check.code) && check.eligible) {
        const didAward = await awardBadge({
          badgeCode: check.code,
          userId: ownerId,
          badgeIdMap,
        });

        if (didAward) {
          awarded.push({ user_id: ownerId, badge_code: check.code });
          earned.add(check.code);
        }
      }
    }
  }

  const demandUserIds = [...new Set(completedTasks.map((task) => task.user_id))];

  for (const userId of demandUserIds) {
    const earned = await getEarnedBadgeCodes(userId);
    const userCompletedTasks = completedTasksByUser.get(userId) ?? [];
    const userRatings = ratingsByUser.get(userId) ?? [];
    const depositPayments = payments.filter(
      (payment) =>
        payment.from_user_id === userId &&
        payment.type === "deposit" &&
        payment.status === "completed",
    );
    const tipPayments = payments.filter(
      (payment) => payment.from_user_id === userId && payment.type === "tip",
    );

    const demandBadgeChecks: Array<{ code: BadgeCode; eligible: boolean }> = [
      {
        code: "first_task",
        eligible: userCompletedTasks.length >= 1,
      },
      {
        code: "veteran",
        eligible: userCompletedTasks.length >= 20,
      },
      {
        code: "quality_reviewer",
        eligible:
          userRatings.filter((rating) => (rating.comment?.trim().length ?? 0) >= 20).length >= 10,
      },
      {
        code: "scout",
        eligible:
          userRatings.filter((rating) => {
            const task = tasks.find((candidate) => candidate.id === rating.task_id);
            return Boolean(task?.is_seed_task) && (rating.comment?.trim().length ?? 0) >= 20;
          }).length >= 5,
      },
      {
        code: "big_spender",
        eligible: sum(depositPayments.map((payment) => toNumber(payment.amount))) >= 100,
      },
      {
        code: "tipper",
        eligible: tipPayments.length >= 10,
      },
    ];

    for (const check of demandBadgeChecks) {
      if (!earned.has(check.code) && check.eligible) {
        const didAward = await awardBadge({
          badgeCode: check.code,
          userId,
          badgeIdMap,
        });

        if (didAward) {
          awarded.push({ user_id: userId, badge_code: check.code });
          earned.add(check.code);
        }
      }
    }
  }

  return {
    awarded,
    awarded_count: awarded.length,
    scanned_supplier_count: agentsByOwner.size,
    scanned_demand_user_count: demandUserIds.length,
  };
}
