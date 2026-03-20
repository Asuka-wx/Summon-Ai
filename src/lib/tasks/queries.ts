import { createAdminClient } from "@/lib/supabase/admin";

const USER_TASK_SELECT = `
  id,
  user_id,
  agent_id,
  status,
  phase,
  round_count,
  paid_rounds,
  total_charge,
  locked_price_per_call,
  pause_reason,
  pause_expires_at,
  end_reason,
  last_activity_at,
  created_at,
  confirmed_at,
  completed_at,
  is_seed_task,
  is_direct,
  is_test,
  agents (
    id,
    name,
    tagline,
    avatar_url,
    status,
    price_per_call
  )
`;

type TaskAgent = {
  id: string;
  name: string;
  tagline: string;
  avatar_url: string | null;
  status: string;
  price_per_call: number;
};

type TaskAgentRelation = TaskAgent | TaskAgent[] | null;

type TaskRow = {
  id: string;
  user_id: string;
  agent_id: string;
  status: string;
  phase: string;
  round_count: number | null;
  paid_rounds: number | null;
  total_charge: number | string | null;
  locked_price_per_call: number | string | null;
  pause_reason: string | null;
  pause_expires_at: string | null;
  end_reason: string | null;
  last_activity_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  is_seed_task: boolean | null;
  is_direct: boolean | null;
  is_test: boolean | null;
  agents: TaskAgentRelation;
};

function normalizeTask(task: TaskRow) {
  const relatedAgent = Array.isArray(task.agents) ? task.agents[0] ?? null : task.agents;

  return {
    id: task.id,
    user_id: task.user_id,
    agent_id: task.agent_id,
    status: task.status,
    phase: task.phase,
    round_count: Number(task.round_count ?? 0),
    paid_rounds: Number(task.paid_rounds ?? 0),
    total_charge: Number(task.total_charge ?? 0),
    locked_price_per_call: Number(task.locked_price_per_call ?? 0),
    pause_reason: task.pause_reason,
    pause_expires_at: task.pause_expires_at,
    end_reason: task.end_reason,
    last_activity_at: task.last_activity_at,
    created_at: task.created_at,
    confirmed_at: task.confirmed_at,
    completed_at: task.completed_at,
    is_seed_task: Boolean(task.is_seed_task),
    is_direct: Boolean(task.is_direct),
    is_test: Boolean(task.is_test),
    agent: relatedAgent
      ? {
          id: relatedAgent.id,
          name: relatedAgent.name,
          tagline: relatedAgent.tagline,
          avatar_url: relatedAgent.avatar_url,
          status: relatedAgent.status,
          price_per_call: Number(relatedAgent.price_per_call ?? 0),
        }
      : null,
  };
}

export async function getUserTaskSnapshot(userId: string, taskId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(USER_TASK_SELECT)
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("task_not_found");
  }

  return normalizeTask(data as TaskRow);
}

export async function listUserTasks({
  userId,
  status,
  page,
  limit,
}: {
  userId: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("tasks")
    .select(USER_TASK_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  return {
    tasks: (data ?? []).map((task) => normalizeTask(task as TaskRow)),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function listPendingRatings(userId: string) {
  const supabase = createAdminClient();
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(USER_TASK_SELECT)
    .eq("user_id", userId)
    .in("status", ["completed", "cancelled"])
    .order("completed_at", { ascending: false })
    .limit(50);

  if (tasksError) {
    throw new Error("validation_error");
  }

  const taskIds = (tasks ?? []).map((task) => task.id);

  if (taskIds.length === 0) {
    return [];
  }

  const { data: ratings, error: ratingsError } = await supabase
    .from("ratings")
    .select("task_id")
    .eq("user_id", userId)
    .in("task_id", taskIds);

  if (ratingsError) {
    throw new Error("validation_error");
  }

  const ratedTaskIds = new Set((ratings ?? []).map((rating) => rating.task_id));

  return (tasks ?? [])
    .filter((task) => !ratedTaskIds.has(task.id))
    .map((task) => normalizeTask(task as TaskRow));
}
