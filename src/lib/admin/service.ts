import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { getGasStatus, getUserBalanceSummary } from "@/lib/payments/service";
import { getPlatformConfigValue, setPlatformConfigValue } from "@/lib/platform-config/service";
import { createAdminClient } from "@/lib/supabase/admin";

type DashboardPeriod = "today" | "yesterday" | "week" | "month" | "custom";

type DateWindowQuery<TQuery> = {
  gte(column: string, value: string): TQuery;
  lte(column: string, value: string): TQuery;
};

function resolveRange({
  period,
  start,
  end,
}: {
  period: DashboardPeriod;
  start?: string;
  end?: string;
}) {
  const now = new Date();

  if (period === "custom" && start && end) {
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    };
  }

  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === "yesterday") {
    const startDate = new Date(anchor);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    return {
      start: startDate.toISOString(),
      end: anchor.toISOString(),
    };
  }

  if (period === "week") {
    const startDate = new Date(anchor);
    startDate.setUTCDate(startDate.getUTCDate() - 7);
    return {
      start: startDate.toISOString(),
      end: now.toISOString(),
    };
  }

  if (period === "month") {
    const startDate = new Date(anchor);
    startDate.setUTCMonth(startDate.getUTCMonth() - 1);
    return {
      start: startDate.toISOString(),
      end: now.toISOString(),
    };
  }

  return {
    start: anchor.toISOString(),
    end: now.toISOString(),
  };
}

function applyDateWindow<TQuery extends DateWindowQuery<TQuery>>(
  query: TQuery,
  column: string,
  start?: string,
  end?: string,
) {
  let nextQuery = query;

  if (start) {
    nextQuery = nextQuery.gte(column, start);
  }

  if (end) {
    nextQuery = nextQuery.lte(column, end);
  }

  return nextQuery;
}

export async function getAdminDashboard({
  period,
  start,
  end,
}: {
  period: DashboardPeriod;
  start?: string;
  end?: string;
}) {
  const supabase = createAdminClient();
  const range = resolveRange({ period, start, end });

  const [
    { count: totalUsers },
    { count: newUsers },
    { count: frozenUsers },
    { count: totalAgents },
    { count: newAgents },
    { count: totalTasks },
    { count: completedTasks },
    { count: activeTasks },
    { count: pendingReports },
    { data: payments },
    { data: withdrawals },
    { data: agents },
    maintenanceMode,
    gasStatus,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    applyDateWindow(
      supabase.from("users").select("id", { count: "exact", head: true }),
      "created_at",
      range.start,
      range.end,
    ),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("is_frozen", true),
    supabase.from("agents").select("id", { count: "exact", head: true }),
    applyDateWindow(
      supabase.from("agents").select("id", { count: "exact", head: true }),
      "created_at",
      range.start,
      range.end,
    ),
    applyDateWindow(
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      "created_at",
      range.start,
      range.end,
    ),
    applyDateWindow(
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      "created_at",
      range.start,
      range.end,
    ),
    supabase.from("tasks").select("id", { count: "exact", head: true }).in("status", ["confirming", "active", "paused"]),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    applyDateWindow(
      supabase.from("payments").select("amount, type, status"),
      "created_at",
      range.start,
      range.end,
    ),
    applyDateWindow(
      supabase.from("withdrawals").select("amount, status"),
      "created_at",
      range.start,
      range.end,
    ),
    supabase.from("agents").select("health_score"),
    getPlatformConfigValue("maintenance_mode", { enabled: false }),
    getGasStatus(),
  ]);

  const totalPaymentVolume = (payments ?? [])
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const totalWithdrawalVolume = (withdrawals ?? [])
    .filter((withdrawal) => withdrawal.status === "completed")
    .reduce((sum, withdrawal) => sum + Number(withdrawal.amount ?? 0), 0);
  const averageHealth =
    (agents ?? []).length === 0
      ? 0
      : Number(
          (
            (agents ?? []).reduce((sum, agent) => sum + Number(agent.health_score ?? 0), 0) /
            Math.max((agents ?? []).length, 1)
          ).toFixed(2),
        );

  return {
    range,
    users: {
      total: totalUsers ?? 0,
      new: newUsers ?? 0,
      frozen: frozenUsers ?? 0,
    },
    agents: {
      total: totalAgents ?? 0,
      new: newAgents ?? 0,
      average_health: averageHealth,
    },
    tasks: {
      total: totalTasks ?? 0,
      completed: completedTasks ?? 0,
      active: activeTasks ?? 0,
    },
    funds: {
      payment_volume: Number(totalPaymentVolume.toFixed(4)),
      withdrawal_volume: Number(totalWithdrawalVolume.toFixed(4)),
    },
    reports: {
      pending: pendingReports ?? 0,
    },
    system: {
      maintenance_mode: Boolean((maintenanceMode as { enabled?: boolean })?.enabled),
      gas: gasStatus,
    },
  };
}

export async function listAdminUsers({
  page,
  limit,
  q,
  role,
  isFrozen,
}: {
  page: number;
  limit: number;
  q?: string;
  role?: string;
  isFrozen?: boolean;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("users")
    .select("id, display_name, email, role, is_frozen, locale, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (role) {
    query = query.eq("role", role);
  }

  if (typeof isFrozen === "boolean") {
    query = query.eq("is_frozen", isFrozen);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  const userIds = (data ?? []).map((user) => user.id);
  const { data: balances } =
    userIds.length > 0
      ? await supabase.from("user_balances").select("user_id, balance").in("user_id", userIds)
      : { data: [] };
  const balancesByUserId = new Map((balances ?? []).map((row) => [row.user_id, Number(row.balance ?? 0)]));

  return {
    users: (data ?? []).map((user) => ({
      ...user,
      balance: balancesByUserId.get(user.id) ?? 0,
    })),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getAdminUserDetail(userId: string) {
  const supabase = createAdminClient();
  const [{ data: user, error }, balance, { data: tasks }, { data: reports }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, display_name, email, avatar_url, bio, role, is_frozen, locale, github_handle, twitter_handle, payout_wallet, payout_chain, created_at, updated_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    getUserBalanceSummary(userId),
    supabase
      .from("tasks")
      .select("id, status, phase, total_charge, created_at, completed_at, end_reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reports")
      .select("*")
      .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (error || !user) {
    throw new Error("not_found");
  }

  return {
    user,
    balance,
    recent_tasks: tasks ?? [],
    reports: reports ?? [],
  };
}

export async function setUserFrozen({
  userId,
  adminId,
  frozen,
}: {
  userId: string;
  adminId: string;
  frozen: boolean;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .update({
      is_frozen: frozen,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, is_frozen")
    .single();

  if (error || !data) {
    throw new Error("not_found");
  }

  await supabase.from("audit_logs").insert({
    event_type: frozen ? "user_frozen" : "user_unfrozen",
    user_id: adminId,
    amount: 0,
    metadata: {
      target_user_id: userId,
    },
  });

  return data;
}

export async function listAdminAgents({
  page,
  limit,
  status,
  qualityStatus,
  q,
}: {
  page: number;
  limit: number;
  status?: string;
  qualityStatus?: string;
  q?: string;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("agents")
    .select(
      "id, owner_id, name, tagline, status, quality_status, health_score, avg_rating, rating_count, total_tasks, active_tasks, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  if (qualityStatus) {
    query = query.eq("quality_status", qualityStatus);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,tagline.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  return {
    agents: (data ?? []).map((agent) => ({
      ...agent,
      health_score: Number(agent.health_score ?? 0),
      avg_rating: Number(agent.avg_rating ?? 0),
      rating_count: Number(agent.rating_count ?? 0),
      total_tasks: Number(agent.total_tasks ?? 0),
      active_tasks: Number(agent.active_tasks ?? 0),
    })),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getAdminAgentDetail(agentId: string) {
  const supabase = createAdminClient();
  const [{ data: agent, error }, { data: dailyStats }, { data: reports }, { data: tasks }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .maybeSingle(),
    supabase
      .from("agent_daily_stats")
      .select("*")
      .eq("agent_id", agentId)
      .order("stat_date", { ascending: false })
      .limit(14),
    supabase
      .from("reports")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, status, phase, total_charge, created_at, completed_at, end_reason")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (error || !agent) {
    throw new Error("agent_not_found");
  }

  return {
    agent: {
      ...agent,
      price_per_call: Number(agent.price_per_call ?? 0),
      health_score: Number(agent.health_score ?? 0),
      avg_rating: Number(agent.avg_rating ?? 0),
      total_earnings: Number(agent.total_earnings ?? 0),
      total_tips: Number(agent.total_tips ?? 0),
    },
    daily_stats: dailyStats ?? [],
    reports: reports ?? [],
    recent_tasks: tasks ?? [],
  };
}

export async function updateAdminAgent({
  agentId,
  adminId,
  status,
  qualityStatus,
}: {
  agentId: string;
  adminId: string;
  status?: string;
  qualityStatus?: string;
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    updates.status = status;
  }

  if (qualityStatus) {
    updates.quality_status = qualityStatus;
    updates.quality_status_changed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", agentId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("agent_not_found");
  }

  await supabase.from("audit_logs").insert({
    event_type: "admin_agent_updated",
    user_id: adminId,
    agent_id: agentId,
    amount: 0,
    metadata: {
      status,
      quality_status: qualityStatus,
    },
  });

  return data;
}

export async function listAdminTasks({
  page,
  limit,
  status,
  start,
  end,
}: {
  page: number;
  limit: number;
  status?: string;
  start?: string;
  end?: string;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("tasks")
    .select(
      "id, user_id, agent_id, status, phase, round_count, paid_rounds, total_charge, is_seed_task, is_direct, created_at, completed_at, end_reason",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  query = applyDateWindow(query, "created_at", start, end);

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  return {
    tasks: (data ?? []).map((task) => ({
      ...task,
      total_charge: Number(task.total_charge ?? 0),
      round_count: Number(task.round_count ?? 0),
      paid_rounds: Number(task.paid_rounds ?? 0),
    })),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getAdminTaskDetail(taskId: string) {
  const supabase = createAdminClient();
  const [{ data: task, error }, { data: user }, { data: agent }, messages] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("users(id, display_name, email)")
      .eq("id", taskId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("agents(id, name, owner_id, status)")
      .eq("id", taskId)
      .maybeSingle(),
    getDecryptedTaskMessages(taskId, supabase).catch(() => []),
  ]);

  if (error || !task) {
    throw new Error("task_not_found");
  }

  const relatedUser = Array.isArray(user?.users) ? user?.users[0] : user?.users;
  const relatedAgent = Array.isArray(agent?.agents) ? agent?.agents[0] : agent?.agents;

  return {
    task: {
      ...task,
      total_charge: Number(task.total_charge ?? 0),
      platform_fee: Number(task.platform_fee ?? 0),
      locked_price_per_call: Number(task.locked_price_per_call ?? 0),
    },
    user: relatedUser ?? null,
    agent: relatedAgent ?? null,
    message_count: messages.length,
    messages,
  };
}

export async function listAdminTransactions({
  page,
  limit,
  type,
  status,
  start,
  end,
}: {
  page: number;
  limit: number;
  type?: string;
  status?: string;
  start?: string;
  end?: string;
}) {
  const supabase = createAdminClient();
  let paymentsQuery = supabase
    .from("payments")
    .select("id, task_id, from_user_id, to_user_id, type, amount, platform_fee, tx_hash, status, created_at");
  let withdrawalsQuery = supabase
    .from("withdrawals")
    .select("id, user_id, amount, fee, net_amount, wallet_address, status, tx_hash, created_at, processed_at");

  paymentsQuery = applyDateWindow(paymentsQuery, "created_at", start, end);
  withdrawalsQuery = applyDateWindow(withdrawalsQuery, "created_at", start, end);

  if (status) {
    paymentsQuery = paymentsQuery.eq("status", status);
    withdrawalsQuery = withdrawalsQuery.eq("status", status);
  }

  if (type) {
    paymentsQuery = paymentsQuery.eq("type", type);
  }

  const [{ data: payments }, { data: withdrawals }] = await Promise.all([
    paymentsQuery,
    withdrawalsQuery,
  ]);

  const items = [
    ...(payments ?? []).map((payment) => ({
      kind: "payment" as const,
      id: payment.id,
      created_at: payment.created_at,
      status: payment.status,
      type: payment.type,
      amount: Number(payment.amount ?? 0),
      platform_fee: Number(payment.platform_fee ?? 0),
      tx_hash: payment.tx_hash,
      task_id: payment.task_id,
      from_user_id: payment.from_user_id,
      to_user_id: payment.to_user_id,
    })),
    ...(withdrawals ?? []).map((withdrawal) => ({
      kind: "withdrawal" as const,
      id: withdrawal.id,
      created_at: withdrawal.created_at,
      status: withdrawal.status,
      type: "withdrawal",
      amount: Number(withdrawal.amount ?? 0),
      fee: Number(withdrawal.fee ?? 0),
      net_amount: Number(withdrawal.net_amount ?? 0),
      tx_hash: withdrawal.tx_hash,
      user_id: withdrawal.user_id,
      wallet_address: withdrawal.wallet_address,
    })),
  ]
    .filter((item) => !type || item.type === type)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  const from = (page - 1) * limit;
  const to = from + limit;

  return {
    transactions: items.slice(from, to),
    total: items.length,
    page,
    limit,
  };
}

export async function listAdminAuditLogs({
  page,
  limit,
  eventType,
  userId,
  taskId,
  start,
  end,
}: {
  page: number;
  limit: number;
  eventType?: string;
  userId?: string;
  taskId?: string;
  start?: string;
  end?: string;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (taskId) {
    query = query.eq("task_id", taskId);
  }

  query = applyDateWindow(query, "created_at", start, end);

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  return {
    logs: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function listAdminWithdrawals({
  page,
  limit,
  status,
}: {
  page: number;
  limit: number;
  status?: string;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("withdrawals")
    .select("*", { count: "exact" })
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
    withdrawals: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function updateAdminWithdrawal({
  withdrawalId,
  adminId,
  status,
  txHash,
}: {
  withdrawalId: string;
  adminId: string;
  status: string;
  txHash?: string;
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    status,
    processed_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
  };

  if (txHash) {
    updates.tx_hash = txHash;
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .update(updates)
    .eq("id", withdrawalId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("not_found");
  }

  await supabase.from("audit_logs").insert({
    event_type: "withdrawal_admin_updated",
    user_id: adminId,
    amount: 0,
    metadata: {
      withdrawal_id: withdrawalId,
      status,
      tx_hash: txHash ?? null,
    },
  });

  return data;
}

export async function listAdminAlerts({
  page,
  limit,
  status,
  alertType,
}: {
  page: number;
  limit: number;
  status?: string;
  alertType?: string;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("admin_alerts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  if (alertType) {
    query = query.eq("alert_type", alertType);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error("validation_error");
  }

  return {
    alerts: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function updateAdminAlert({
  alertId,
  adminId,
  status,
  adminNote,
}: {
  alertId: string;
  adminId: string;
  status: string;
  adminNote?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_alerts")
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      resolved_by: status === "pending" ? null : adminId,
      resolved_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", alertId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("not_found");
  }

  return data;
}

export async function listAdminConfigEntries() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("platform_config")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    throw new Error("validation_error");
  }

  return data ?? [];
}

export async function updateAdminConfigEntry({
  key,
  value,
  description,
  adminId,
}: {
  key: string;
  value: unknown;
  description?: string;
  adminId: string;
}) {
  await setPlatformConfigValue(key, value, description);
  const supabase = createAdminClient();

  await supabase.from("audit_logs").insert({
    event_type: "config_changed",
    user_id: adminId,
    amount: 0,
    metadata: {
      key,
      description: description ?? null,
    },
  });

  return {
    key,
    value,
    description: description ?? null,
  };
}
