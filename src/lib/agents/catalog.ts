import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

type PublicAgentRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  tagline: string;
  description: string;
  categories: string[] | null;
  supported_languages: string[] | null;
  status: string;
  price_per_call: number | string;
  quality_status: string | null;
  avg_rating: number | string | null;
  rating_count: number | null;
  total_tasks: number | null;
  total_earnings?: number | string | null;
  total_tips?: number | string | null;
  health_score?: number | string | null;
  is_seed: boolean | null;
  seed_free_remaining: number | null;
  seed_max_rounds: number | null;
  sdk_last_heartbeat?: string | null;
  avatar_url?: string | null;
  follower_count?: number | null;
  created_at?: string;
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function normalizeAgent(agent: PublicAgentRow) {
  return {
    ...agent,
    price_per_call: toNumber(agent.price_per_call),
    avg_rating: agent.avg_rating === null ? null : toNumber(agent.avg_rating),
    total_earnings:
      agent.total_earnings === undefined ? undefined : toNumber(agent.total_earnings),
    total_tips: agent.total_tips === undefined ? undefined : toNumber(agent.total_tips),
    health_score:
      agent.health_score === undefined || agent.health_score === null
        ? null
        : toNumber(agent.health_score),
    follower_count: Number(agent.follower_count ?? 0),
    rating_count: Number(agent.rating_count ?? 0),
    total_tasks: Number(agent.total_tasks ?? 0),
    seed_free_remaining: Number(agent.seed_free_remaining ?? 0),
    seed_max_rounds: Number(agent.seed_max_rounds ?? 0),
  };
}

function overlapsCategory(left: string[] | null | undefined, right: string[] | null | undefined) {
  const leftSet = new Set(left ?? []);
  return (right ?? []).some((value) => leftSet.has(value));
}

function matchesSearch(agent: PublicAgentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [agent.name, agent.tagline, agent.description]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function computePercentile95(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? sorted[sorted.length - 1] ?? 0;
}

async function getRecentTaskCounts() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .select("agent_id")
    .eq("is_test", false)
    .gte("created_at", cutoff);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<Map<string, number>>((accumulator, task) => {
    accumulator.set(task.agent_id, (accumulator.get(task.agent_id) ?? 0) + 1);
    return accumulator;
  }, new Map());
}

async function getLatestRisingScores() {
  const snapshots = await getLatestLeaderboardSnapshots().catch(() => null);
  const rankings = snapshots?.weeklyOverall?.rankings ?? [];

  return rankings.reduce<Map<string, number>>((accumulator, ranking) => {
    const risingScore = Number(ranking.rising_score ?? 0);

    if (risingScore > 0) {
      accumulator.set(ranking.agent_id, risingScore);
    }

    return accumulator;
  }, new Map());
}

export async function listPublicAgents(options?: {
  category?: string;
  q?: string;
  section?: "hot" | "new" | "top" | "rising" | "free";
  sort?: "rating" | "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, owner_id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, quality_status, avg_rating, rating_count, total_tasks, is_seed, seed_free_remaining, seed_max_rounds, follower_count, created_at",
    )
    .neq("status", "archived")
    .neq("quality_status", "hidden");

  if (error) {
    throw new Error(error.message);
  }

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const offset = Math.max(options?.offset ?? 0, 0);
  const category = options?.category?.trim();
  const query = options?.q?.trim();
  let agents = (data ?? []).map((agent) => normalizeAgent(agent as PublicAgentRow));

  if (category) {
    agents = agents.filter((agent) => (agent.categories ?? []).includes(category));
  }

  if (query) {
    agents = agents.filter((agent) => matchesSearch(agent, query));
  }

  if (options?.section === "hot") {
    const taskCounts = await getRecentTaskCounts();
    agents = agents
      .filter(
        (agent) =>
          agent.status === "online" &&
          ["normal", "warned"].includes(agent.quality_status ?? "normal"),
      )
      .sort((left, right) => {
        const leftScore =
          (taskCounts.get(left.id) ?? 0) * 0.6 +
          Number(left.follower_count ?? 0) * 0.2 +
          Number(left.avg_rating ?? 0) * 0.2;
        const rightScore =
          (taskCounts.get(right.id) ?? 0) * 0.6 +
          Number(right.follower_count ?? 0) * 0.2 +
          Number(right.avg_rating ?? 0) * 0.2;

        return rightScore - leftScore;
      });
    return agents.slice(offset, offset + limit);
  }

  if (options?.section === "new") {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    agents = agents
      .filter((agent) => {
        const createdAt = agent.created_at ? new Date(agent.created_at).getTime() : 0;
        return ["online", "offline"].includes(agent.status) && createdAt >= thirtyDaysAgo;
      })
      .sort((left, right) => {
        return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
      });
    return agents.slice(offset, offset + limit);
  }

  if (options?.section === "top") {
    agents = agents
      .filter(
        (agent) =>
          Number(agent.rating_count ?? 0) >= 5 && (agent.quality_status ?? "normal") === "normal",
      )
      .sort((left, right) => {
        const ratingDelta = Number(right.avg_rating ?? 0) - Number(left.avg_rating ?? 0);
        if (ratingDelta !== 0) {
          return ratingDelta;
        }

        return Number(right.rating_count ?? 0) - Number(left.rating_count ?? 0);
      });
    return agents.slice(offset, offset + limit);
  }

  if (options?.section === "rising") {
    const risingScores = await getLatestRisingScores();
    agents = agents
      .filter(
        (agent) =>
          Number(agent.rating_count ?? 0) >= 5 && (risingScores.get(agent.id) ?? 0) > 0,
      )
      .sort((left, right) => (risingScores.get(right.id) ?? 0) - (risingScores.get(left.id) ?? 0));
    return agents.slice(offset, offset + limit);
  }

  if (options?.section === "free") {
    agents = agents
      .filter((agent) => agent.status === "online" && Number(agent.price_per_call ?? 0) === 0)
      .sort((left, right) => Number(right.follower_count ?? 0) - Number(left.follower_count ?? 0));
    return agents.slice(offset, offset + limit);
  }

  if (options?.sort === "newest") {
    agents = agents.sort((left, right) => {
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
    });
  } else if (options?.sort === "price_asc") {
    agents = agents.sort((left, right) => Number(left.price_per_call) - Number(right.price_per_call));
  } else if (options?.sort === "price_desc") {
    agents = agents.sort((left, right) => Number(right.price_per_call) - Number(left.price_per_call));
  } else {
    agents = agents.sort((left, right) => {
      const statusDelta = left.status.localeCompare(right.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return Number(right.avg_rating ?? 0) - Number(left.avg_rating ?? 0);
    });
  }

  return agents.slice(offset, offset + limit);
}

export async function getPublicAgentDetail(agentId: string, viewerId?: string | null) {
  const supabase = createAdminClient();
  const { data: agentData, error } = await supabase
    .from("agents")
    .select(
      "id, owner_id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, quality_status, avg_rating, rating_count, total_tasks, total_earnings, total_tips, health_score, is_seed, seed_free_remaining, seed_max_rounds, sdk_last_heartbeat, avatar_url, follower_count",
    )
    .eq("id", agentId)
    .neq("status", "archived")
    .neq("quality_status", "hidden")
    .single();

  if (error || !agentData) {
    throw new Error("agent_not_found");
  }

  const agent = normalizeAgent(agentData as PublicAgentRow);
  const [ownerResult, categoryAgentsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, display_name, avatar_url, bio")
      .eq("id", agent.owner_id)
      .maybeSingle(),
    supabase
      .from("agents")
      .select("price_per_call, categories")
      .neq("status", "archived")
      .neq("quality_status", "hidden"),
  ]);

  const sameCategoryPrices = (categoryAgentsResult.data ?? [])
    .filter((candidate) => overlapsCategory(candidate.categories, agent.categories))
    .map((candidate) => Number(candidate.price_per_call ?? 0));

  const isOwner = Boolean(viewerId && agent.owner_id === viewerId);
  let hasUsedSeed = false;

  if (viewerId && !isOwner) {
    const { count } = await supabase
      .from("seed_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewerId)
      .eq("agent_id", agentId);

    hasUsedSeed = (count ?? 0) > 0;
  }

  const canUseFreeTrial =
    Boolean(agent.is_seed) &&
    Number(agent.seed_free_remaining ?? 0) > 0 &&
    !hasUsedSeed &&
    !isOwner;

  const nextUseLabel =
    Number(agent.price_per_call ?? 0) > 0 ? "again_paid" : "again_free";

  return {
    agent: {
      ...agent,
      category_p95_price: computePercentile95(sameCategoryPrices),
    },
    creator: ownerResult.data
      ? {
          id: ownerResult.data.id,
          display_name: ownerResult.data.display_name,
          avatar_url: ownerResult.data.avatar_url,
          bio: ownerResult.data.bio,
        }
      : null,
    viewer: {
      viewer_id: viewerId ?? null,
      is_owner: isOwner,
      has_used_seed: hasUsedSeed,
      can_use_free_trial: canUseFreeTrial,
      next_use_label: nextUseLabel,
    },
  };
}

export async function listAgentRatings({
  agentId,
  page,
  limit,
}: {
  agentId: string;
  page: number;
  limit: number;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from("ratings")
    .select("id, rating, comment, tip_amount, created_at, user_id, users(display_name, avatar_url)", {
      count: "exact",
    })
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("validation_error");
  }

  return {
    ratings: (data ?? []).map((rating) => ({
      id: rating.id,
      rating: Number(rating.rating ?? 0),
      comment: rating.comment,
      tip_amount: Number(rating.tip_amount ?? 0),
      created_at: rating.created_at,
      user: Array.isArray(rating.users)
        ? rating.users[0] ?? null
        : rating.users ?? null,
    })),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function listAgentDemos(agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_demos")
    .select("id, title, messages, sort_order, created_at")
    .eq("agent_id", agentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("validation_error");
  }

  return data ?? [];
}
