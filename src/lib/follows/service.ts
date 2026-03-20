import { sendNotification } from "@/lib/notifications/service";
import {
  invalidateSimilarRecommendations,
  invalidateUserRecommendations,
} from "@/lib/recommendations/service";
import { createAdminClient } from "@/lib/supabase/admin";

type AgentCard = {
  id: string;
  name: string;
  tagline: string;
  avatar_url: string | null;
  status: string;
  price_per_call: number | string;
  avg_rating: number | string | null;
  categories: string[] | null;
};

type CreatorCard = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

function normalizeFollowingAgent(agent: AgentCard) {
  return {
    ...agent,
    price_per_call: Number(agent.price_per_call ?? 0),
    avg_rating: agent.avg_rating === null ? null : Number(agent.avg_rating ?? 0),
  };
}

export async function followAgent(userId: string, agentId: string) {
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, owner_id")
    .eq("id", agentId)
    .maybeSingle();

  if (error || !agent) {
    throw new Error("agent_not_found");
  }

  const { error: insertError } = await supabase.from("follows").insert({
    user_id: userId,
    target_agent_id: agentId,
  });

  if (insertError) {
    throw new Error("already_following");
  }

  if (agent.owner_id && agent.owner_id !== userId) {
    void sendNotification(agent.owner_id, "ranking_change", {
      source: "agent_follow",
      agent_id: agentId,
    });
  }

  await invalidateUserRecommendations(userId);
  await invalidateSimilarRecommendations(agentId);

  return {
    ok: true,
    target_agent_id: agentId,
  };
}

export async function unfollowAgent(userId: string, agentId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("target_agent_id", agentId);

  await invalidateUserRecommendations(userId);
  await invalidateSimilarRecommendations(agentId);

  return {
    ok: true,
    target_agent_id: agentId,
  };
}

export async function followCreator(userId: string, creatorId: string) {
  const supabase = createAdminClient();
  const { data: creator, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", creatorId)
    .maybeSingle();

  if (error || !creator) {
    throw new Error("not_found");
  }

  const { error: insertError } = await supabase.from("follows").insert({
    user_id: userId,
    target_user_id: creatorId,
  });

  if (insertError) {
    throw new Error("already_following");
  }

  await invalidateUserRecommendations(userId);

  return {
    ok: true,
    target_user_id: creatorId,
  };
}

export async function unfollowCreator(userId: string, creatorId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("follows")
    .delete()
    .eq("user_id", userId)
    .eq("target_user_id", creatorId);

  await invalidateUserRecommendations(userId);

  return {
    ok: true,
    target_user_id: creatorId,
  };
}

export async function listUserFollowing(userId: string) {
  const supabase = createAdminClient();
  const { data: follows, error } = await supabase
    .from("follows")
    .select("target_agent_id, target_user_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("validation_error");
  }

  const agentIds = [...new Set((follows ?? []).map((follow) => follow.target_agent_id).filter(Boolean))];
  const creatorIds = [...new Set((follows ?? []).map((follow) => follow.target_user_id).filter(Boolean))];

  const [{ data: agents }, { data: creators }] = await Promise.all([
    agentIds.length > 0
      ? supabase
          .from("agents")
          .select("id, name, tagline, avatar_url, status, price_per_call, avg_rating, categories")
          .in("id", agentIds)
      : Promise.resolve({ data: [] as AgentCard[] }),
    creatorIds.length > 0
      ? supabase
          .from("users")
          .select("id, display_name, avatar_url, bio")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] as CreatorCard[] }),
  ]);

  const agentsById = new Map((agents ?? []).map((agent) => [agent.id, agent]));
  const creatorsById = new Map((creators ?? []).map((creator) => [creator.id, creator]));

  const items: Array<
    | {
        type: "agent";
        created_at: string;
        agent: ReturnType<typeof normalizeFollowingAgent>;
      }
    | {
        type: "creator";
        created_at: string;
        creator: CreatorCard;
      }
  > = [];

  for (const follow of follows ?? []) {
    if (follow.target_agent_id) {
      const agent = agentsById.get(follow.target_agent_id);

      if (!agent) {
        continue;
      }

      items.push({
        type: "agent",
        created_at: follow.created_at,
        agent: normalizeFollowingAgent(agent),
      });
      continue;
    }

    if (follow.target_user_id) {
      const creator = creatorsById.get(follow.target_user_id);

      if (!creator) {
        continue;
      }

      items.push({
        type: "creator",
        created_at: follow.created_at,
        creator,
      });
    }
  }

  return items;
}
