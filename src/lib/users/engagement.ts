import { createAdminClient } from "@/lib/supabase/admin";

type AgentSummaryRow = {
  id: string;
  name: string;
  tagline: string;
  avatar_url: string | null;
  status: string;
  price_per_call: number | string;
  avg_rating: number | string | null;
  categories: string[] | null;
};

function normalizeAgent(agent: AgentSummaryRow) {
  return {
    ...agent,
    price_per_call: Number(agent.price_per_call ?? 0),
    avg_rating: agent.avg_rating === null ? null : Number(agent.avg_rating ?? 0),
  };
}

export async function listUserToolbox(userId: string) {
  const supabase = createAdminClient();
  const { data: usageRows, error } = await supabase
    .from("user_agent_usage")
    .select("agent_id, last_used_at, use_count")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("validation_error");
  }

  let orderedUsage = usageRows ?? [];

  if (orderedUsage.length === 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("agent_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const seen = new Set<string>();
    orderedUsage = (tasks ?? []).flatMap((task) => {
      if (!task.agent_id || seen.has(task.agent_id)) {
        return [];
      }

      seen.add(task.agent_id);
      return [
        {
          agent_id: task.agent_id,
          last_used_at: task.created_at,
          use_count: 1,
        },
      ];
    });
  }

  const agentIds = orderedUsage.map((row) => row.agent_id);

  if (agentIds.length === 0) {
    return [];
  }

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, tagline, avatar_url, status, price_per_call, avg_rating, categories")
    .in("id", agentIds);

  const agentsById = new Map((agents ?? []).map((agent) => [agent.id, agent as AgentSummaryRow]));

  return orderedUsage.flatMap((row) => {
    const agent = agentsById.get(row.agent_id);

    if (!agent) {
      return [];
    }

    return [
      {
        last_used_at: row.last_used_at,
        use_count: Number(row.use_count ?? 1),
        agent: normalizeAgent(agent),
      },
    ];
  });
}
