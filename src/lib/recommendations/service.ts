import { listPublicAgents } from "@/lib/agents/catalog";
import { getRedisClient } from "@/lib/upstash/client";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_CACHE_TTL_SECONDS = 60 * 60;
const SIMILAR_CACHE_TTL_SECONDS = 60 * 60;

function getUserRecommendationCacheKey(userId: string) {
  return `rec:${userId}`;
}

function getSimilarAgentRecommendationCacheKey(agentId: string) {
  return `rec:similar:${agentId}`;
}

async function getRecentUserCategories(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("agent_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const agentIds = [...new Set((data ?? []).map((task) => task.agent_id))];

  if (agentIds.length === 0) {
    return [];
  }

  const { data: agents } = await supabase
    .from("agents")
    .select("id, categories")
    .in("id", agentIds);

  return (agents ?? []).flatMap((agent) => agent.categories ?? []);
}

async function getFollowOverlapIds(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("follows")
    .select("target_agent_id, target_user_id")
    .eq("user_id", userId);

  return {
    agentIds: new Set((data ?? []).map((row) => row.target_agent_id).filter(Boolean)),
    creatorIds: new Set((data ?? []).map((row) => row.target_user_id).filter(Boolean)),
  };
}

export async function invalidateUserRecommendations(userId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  await redis.del(getUserRecommendationCacheKey(userId));
}

export async function invalidateSimilarRecommendations(agentId: string) {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  await redis.del(getSimilarAgentRecommendationCacheKey(agentId));
}

export async function getRecommendedAgentsForUser(userId?: string | null) {
  if (!userId) {
    const agents = await listPublicAgents({
      section: "hot",
      limit: 6,
      offset: 0,
    });

    return {
      personalized: false,
      agents,
    };
  }

  const redis = getRedisClient();
  const cacheKey = getUserRecommendationCacheKey(userId);

  if (redis) {
    const cached = await redis.get<typeof JSON>(cacheKey);
    if (Array.isArray(cached)) {
      return {
        personalized: true,
        agents: cached,
      };
    }
  }

  const [agents, recentCategories, follows] = await Promise.all([
    listPublicAgents({ limit: 50, offset: 0 }),
    getRecentUserCategories(userId),
    getFollowOverlapIds(userId),
  ]);

  const categoryFrequency = recentCategories.reduce<Map<string, number>>((accumulator, category) => {
    accumulator.set(category, (accumulator.get(category) ?? 0) + 1);
    return accumulator;
  }, new Map());

  const scored = agents
    .map((agent) => {
      const categoryScore = (agent.categories ?? []).reduce((sum, category) => {
        return sum + (categoryFrequency.get(category) ?? 0);
      }, 0);
      const toolboxScore = follows.agentIds.has(agent.id) || follows.creatorIds.has(agent.owner_id)
        ? 1
        : 0;
      const hotScore =
        Number(agent.total_tasks ?? 0) * 0.6 +
        Number(agent.avg_rating ?? 0) * 0.25 +
        Number(agent.follower_count ?? 0) * 0.15;

      return {
        agent,
        score: categoryScore * 0.4 + toolboxScore * 0.3 + hotScore * 0.3,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((item) => item.agent);

  if (redis) {
    await redis.set(cacheKey, scored, { ex: USER_CACHE_TTL_SECONDS });
  }

  return {
    personalized: true,
    agents: scored,
  };
}

export async function getSimilarAgents(agentId: string, viewerId?: string | null) {
  const redis = getRedisClient();
  const cacheKey = getSimilarAgentRecommendationCacheKey(agentId);

  if (redis) {
    const cached = await redis.get<typeof JSON>(cacheKey);
    if (Array.isArray(cached)) {
      return cached;
    }
  }

  const supabase = createAdminClient();
  const { data: currentAgent, error } = await supabase
    .from("agents")
    .select("id, owner_id, categories, price_per_call")
    .eq("id", agentId)
    .maybeSingle();

  if (error || !currentAgent) {
    throw new Error("agent_not_found");
  }

  const allAgents = await listPublicAgents({ limit: 50, offset: 0 });
  let usedAgentIds = new Set<string>();

  if (viewerId) {
    const { data: userTasks } = await supabase
      .from("tasks")
      .select("agent_id")
      .eq("user_id", viewerId);
    usedAgentIds = new Set((userTasks ?? []).map((task) => task.agent_id));
  }

  const price = Number(currentAgent.price_per_call ?? 0);
  const similarAgents = allAgents
    .filter((agent) => agent.id !== agentId)
    .filter((agent) => !usedAgentIds.has(agent.id))
    .filter((agent) => (agent.categories ?? []).some((category) => (currentAgent.categories ?? []).includes(category)))
    .map((agent) => {
      const priceDistance = Math.abs(Number(agent.price_per_call ?? 0) - price);
      const sharedCategoryCount = (agent.categories ?? []).filter((category) =>
        (currentAgent.categories ?? []).includes(category),
      ).length;

      return {
        agent,
        score: sharedCategoryCount * 3 + Number(agent.avg_rating ?? 0) - priceDistance * 0.1,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => item.agent);

  if (redis) {
    await redis.set(cacheKey, similarAgents, { ex: SIMILAR_CACHE_TTL_SECONDS });
  }

  return similarAgents;
}
