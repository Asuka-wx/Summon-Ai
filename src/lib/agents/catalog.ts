import { createAdminClient } from "@/lib/supabase/admin";

export async function listPublicAgents() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, quality_status, avg_rating, rating_count, total_tasks, is_seed, seed_free_remaining, seed_max_rounds",
    )
    .neq("status", "archived")
    .neq("quality_status", "hidden")
    .order("status", { ascending: true })
    .order("avg_rating", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPublicAgentDetail(agentId: string, viewerId?: string | null) {
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select(
      "id, owner_id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, quality_status, avg_rating, rating_count, total_tasks, total_earnings, total_tips, health_score, is_seed, seed_free_remaining, seed_max_rounds, sdk_last_heartbeat",
    )
    .eq("id", agentId)
    .neq("status", "archived")
    .neq("quality_status", "hidden")
    .single();

  if (error || !agent) {
    throw new Error("agent_not_found");
  }

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
    agent,
    viewer: {
      viewer_id: viewerId ?? null,
      is_owner: isOwner,
      has_used_seed: hasUsedSeed,
      can_use_free_trial: canUseFreeTrial,
      next_use_label: nextUseLabel,
    },
  };
}
