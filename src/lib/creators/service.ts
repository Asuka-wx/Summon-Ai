import { listUserBadges } from "@/lib/badges/service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCreatorProfile(creatorId: string) {
  const supabase = createAdminClient();
  const [{ data: creator, error: creatorError }, { data: agents, error: agentsError }, badges] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, avatar_url, bio, created_at")
        .eq("id", creatorId)
        .maybeSingle(),
      supabase
        .from("agents")
        .select(
          "id, name, slug, tagline, description, categories, status, price_per_call, avg_rating, rating_count, total_tasks, total_earnings, total_tips, health_score, follower_count, created_at",
        )
        .eq("owner_id", creatorId)
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      listUserBadges(creatorId),
    ]);

  if (creatorError || !creator) {
    throw new Error("not_found");
  }

  if (agentsError) {
    throw new Error("validation_error");
  }

  const normalizedAgents = (agents ?? []).map((agent) => ({
    ...agent,
    price_per_call: Number(agent.price_per_call ?? 0),
    avg_rating: agent.avg_rating === null ? null : Number(agent.avg_rating ?? 0),
    health_score: agent.health_score === null ? null : Number(agent.health_score ?? 0),
    total_earnings: Number(agent.total_earnings ?? 0),
    total_tips: Number(agent.total_tips ?? 0),
    total_tasks: Number(agent.total_tasks ?? 0),
    rating_count: Number(agent.rating_count ?? 0),
    follower_count: Number(agent.follower_count ?? 0),
  }));

  return {
    creator,
    summary: {
      total_agents: normalizedAgents.length,
      total_tasks: normalizedAgents.reduce((sum, agent) => sum + agent.total_tasks, 0),
      total_earnings: normalizedAgents.reduce(
        (sum, agent) => sum + agent.total_earnings + agent.total_tips,
        0,
      ),
      average_rating:
        normalizedAgents.length === 0
          ? 0
          : Number(
              (
                normalizedAgents.reduce((sum, agent) => sum + Number(agent.avg_rating ?? 0), 0) /
                normalizedAgents.length
              ).toFixed(2),
            ),
    },
    agents: normalizedAgents,
    badges,
  };
}
