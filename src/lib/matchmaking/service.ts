import { randomUUID } from "node:crypto";

import { calculateBidRank } from "@/lib/protocol/bid-rank";
import {
  BROADCAST_WINDOW_SECONDS,
  FREE_ROUNDS,
  MAX_BID_PITCH_LENGTH,
} from "@/lib/protocol/matchmaking";
import { sendNotification } from "@/lib/notifications/service";
import {
  invalidateSimilarRecommendations,
  invalidateUserRecommendations,
} from "@/lib/recommendations/service";
import {
  sendRelayMessage,
  broadcastToAgents,
  assignTaskToAgent,
} from "@/lib/realtime/relay-client";
import { createSellerTestTask as createPersistedSellerTestTask } from "@/lib/seller/tests";
import { buildConversationHistory } from "@/lib/security/conversation-history";
import { encrypt } from "@/lib/security/encryption";
import { createTaskEncryptionKey, getTaskEncryptionKey } from "@/lib/security/task-encryption-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decrementAgentActiveTasks,
  END_REASON,
  getNextTaskStatusForEndReason,
  incrementAgentTotalTasks,
  PAUSE_REASON,
  recordHealthEvent,
  shouldSettleTask,
  shouldIncrementTotalTasks,
  shouldRecordHealthOnly,
  shouldReleaseSlot,
  TASK_PHASE,
  TASK_STATUS,
  type EndReason,
} from "@/lib/tasks/lifecycle";

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function secondsFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function getUserBalance(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_balances")
    .select("balance")
    .eq("user_id", userId)
    .eq("chain", "base")
    .single();

  return Number(data?.balance ?? 0);
}

async function getUserActiveTaskCount(userId: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["confirming", "active", "paused"]);

  return Number(count ?? 0);
}

async function ensureUserTaskCapacity(userId: string) {
  const activeTaskCount = await getUserActiveTaskCount(userId);

  if (activeTaskCount >= Number(process.env.MAX_ACTIVE_TASKS_PER_USER ?? 5)) {
    throw new Error("invalid_task_state");
  }
}

async function ensurePlatformTaskCapacity() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .in("status", ["confirming", "active", "paused"]);

  if (Number(count ?? 0) >= Number(process.env.MAX_PLATFORM_CONCURRENT_TASKS ?? 50)) {
    throw new Error("platform_at_capacity");
  }
}

async function recordUserAgentUsage(userId: string, agentId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("user_agent_usage")
    .select("use_count, created_at")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .maybeSingle();

  await supabase.from("user_agent_usage").upsert(
    {
      user_id: userId,
      agent_id: agentId,
      last_used_at: now,
      use_count: Number(existing?.use_count ?? 0) + 1,
      created_at: existing?.created_at ?? now,
    },
    {
      onConflict: "user_id,agent_id",
    },
  );
}

async function maybeHandleSeedGraduation(agentId: string) {
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, owner_id, seed_free_remaining, is_seed")
    .eq("id", agentId)
    .single();

  if (error || !agent || !agent.is_seed || Number(agent.seed_free_remaining ?? 0) > 0) {
    return;
  }

  const { count: activeSeeds } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("is_seed_task", true)
    .not("status", "in", "(completed,cancelled)");

  if ((activeSeeds ?? 0) > 0) {
    return;
  }

  await supabase
    .from("agents")
    .update({
      is_seed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  void sendNotification(agent.owner_id, "seed_graduation", {
    agent_id: agentId,
  });
}

async function getTaskWithLifecycleContext(taskId: string) {
  const supabase = createAdminClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      "id, user_id, agent_id, status, phase, pause_reason, round_count, paid_rounds, is_seed_task, is_direct, is_test, seed_max_rounds, free_rounds, locked_price_per_call, total_charge, session_id",
    )
    .eq("id", taskId)
    .single();

  if (error || !task) {
    throw new Error("task_not_found");
  }

  return task;
}

async function acquireAgentSlot(agentId: string) {
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, status, active_tasks, max_concurrent")
    .eq("id", agentId)
    .single();

  if (error || !agent) {
    throw new Error("agent_not_found");
  }

  if (!["online", "busy"].includes(agent.status)) {
    throw new Error("agent_offline");
  }

  if (Number(agent.active_tasks ?? 0) >= Number(agent.max_concurrent ?? 1)) {
    throw new Error("slot_unavailable");
  }

  const { data: updatedAgent } = await supabase
    .from("agents")
    .update({
      active_tasks: Number(agent.active_tasks ?? 0) + 1,
      status:
        Number(agent.active_tasks ?? 0) + 1 >= Number(agent.max_concurrent ?? 1)
          ? "busy"
          : "online",
    })
    .eq("id", agentId)
    .eq("active_tasks", agent.active_tasks ?? 0)
    .select("id")
    .single();

  if (!updatedAgent) {
    throw new Error("slot_unavailable");
  }
}

export async function createBroadcast({
  userId,
  prompt,
  categories,
}: {
  userId: string;
  prompt: string;
  categories: string[];
}) {
  const supabase = createAdminClient();
  const bidWindowEnd = secondsFromNow(BROADCAST_WINDOW_SECONDS);
  const selectionExpiresAt = minutesFromNow(
    Number(process.env.BROADCAST_SELECTION_TIMEOUT_MINUTES ?? 10),
  );

  await ensureUserTaskCapacity(userId);
  await ensurePlatformTaskCapacity();

  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      user_id: userId,
      prompt,
      categories,
      status: "bidding",
      bid_window_end: bidWindowEnd,
      selection_expires_at: selectionExpiresAt,
    })
    .select("id, prompt, categories")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  await broadcastToAgents({
    broadcastId: data.id,
    prompt: data.prompt,
    categories: data.categories ?? [],
    userId,
  }).catch(() => {
    // Relay delivery failures should not roll back broadcast creation.
  });

  return data;
}

export async function cancelBroadcast({
  broadcastId,
  userId,
}: {
  broadcastId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("broadcasts")
    .update({
      status: "cancelled",
    })
    .eq("id", broadcastId)
    .eq("user_id", userId)
    .eq("status", "bidding")
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("broadcast_not_found");
  }

  await sendRelayMessage({
    targetUserId: userId,
    type: "sync:state_refresh",
    broadcastId,
    status: "cancelled",
  }).catch(() => {});

  return data;
}

export async function recordBid({
  broadcastId,
  agentId,
  confidence,
  pitch,
  responseTimeMs,
}: {
  broadcastId: string;
  agentId: string;
  confidence: "high" | "medium" | "low";
  pitch: string;
  responseTimeMs: number;
}) {
  const supabase = createAdminClient();

  const { data: broadcast, error: broadcastError } = await supabase
    .from("broadcasts")
    .select("id, user_id, status")
    .eq("id", broadcastId)
    .single();

  if (broadcastError || !broadcast || broadcast.status !== "bidding") {
    throw new Error("broadcast_expired");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, name, avg_rating, price_per_call, owner_id, quality_status, total_tasks")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error("agent_not_found");
  }

  if (agent.owner_id === broadcast.user_id) {
    throw new Error("self_hire_forbidden");
  }

  const safePitch = pitch.slice(0, MAX_BID_PITCH_LENGTH);

  const { error } = await supabase.from("bids").insert({
    broadcast_id: broadcastId,
    agent_id: agent.id,
    confidence,
    pitch: safePitch,
    response_time_ms: responseTimeMs,
  });

  if (error) {
    throw new Error("broadcast_already_selected");
  }

  const { data: bids } = await supabase
    .from("bids")
    .select("id, agent_id")
    .eq("broadcast_id", broadcastId);

  const bidAgentIds = [...new Set([agent.id, ...(bids ?? []).map((bid) => bid.agent_id)])];
  const { data: pricedAgents } = await supabase
    .from("agents")
    .select("id, price_per_call")
    .in("id", bidAgentIds);

  const maxPriceInBatch = Math.max(
    ...(pricedAgents ?? []).map((pricedAgent) => Number(pricedAgent.price_per_call ?? 0)),
    Number(agent.price_per_call ?? 0),
  );
  const bidRank = calculateBidRank({
    confidence,
    avgRating: Number(agent.avg_rating ?? 0),
    pricePerCall: Number(agent.price_per_call ?? 0),
    maxPriceInBatch,
    avgResponseTimeMs: responseTimeMs,
    qualityStatus: (agent.quality_status ?? "normal") as
      | "normal"
      | "warned"
      | "demoted"
      | "hidden"
      | "recovery_pending",
    totalTasks: Number(agent.total_tasks ?? 0),
    platformAverageRating: 4,
  });

  await sendRelayMessage({
    targetUserId: broadcast.user_id,
    targetTaskId: null,
    type: "bid:new",
    broadcastId,
    agentId: agent.id,
    confidence,
    pitch: safePitch,
    bid_rank: bidRank,
    agent_name: agent.name,
    avg_rating: agent.avg_rating ?? 0,
    price_per_call: agent.price_per_call ?? 0,
    bid_count: bids?.length ?? 1,
  }).catch(() => {});

  return {
    bidRank,
    agentId: agent.id,
  };
}

export async function selectAgentForBroadcast({
  broadcastId,
  agentId,
  userId,
}: {
  broadcastId: string;
  agentId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  await ensureUserTaskCapacity(userId);
  await ensurePlatformTaskCapacity();

  const { data: broadcast, error: broadcastError } = await supabase
    .from("broadcasts")
    .select("id, user_id, status, prompt")
    .eq("id", broadcastId)
    .eq("user_id", userId)
    .single();

  if (broadcastError || !broadcast) {
    throw new Error("broadcast_not_found");
  }

  if (broadcast.status !== "bidding") {
    throw new Error("broadcast_already_selected");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, owner_id, status, active_tasks, max_concurrent, price_per_call")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error("agent_not_found");
  }

  if (agent.owner_id === userId) {
    throw new Error("self_hire_forbidden");
  }

  if (agent.status !== "online") {
    throw new Error("agent_offline");
  }

  if (Number(agent.active_tasks ?? 0) >= Number(agent.max_concurrent ?? 1)) {
    throw new Error("slot_unavailable");
  }

  const { data: updatedBroadcast } = await supabase
    .from("broadcasts")
    .update({
      status: "selected",
      selected_agent_id: agentId,
    })
    .eq("id", broadcastId)
    .eq("status", "bidding")
    .is("selected_agent_id", null)
    .select("id")
    .single();

  if (!updatedBroadcast) {
    throw new Error("broadcast_already_selected");
  }

  const { data: updatedAgent } = await supabase
    .from("agents")
    .update({
      active_tasks: Number(agent.active_tasks ?? 0) + 1,
      status:
        Number(agent.active_tasks ?? 0) + 1 >= Number(agent.max_concurrent ?? 1)
          ? "busy"
          : agent.status,
    })
    .eq("id", agentId)
    .eq("active_tasks", agent.active_tasks ?? 0)
    .select("id")
    .single();

  if (!updatedAgent) {
    throw new Error("slot_unavailable");
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      broadcast_id: broadcastId,
      user_id: userId,
      agent_id: agentId,
      session_id: randomUUID(),
      status: "confirming",
      phase: "confirmation",
      is_seed_task: false,
      is_direct: false,
      free_rounds: FREE_ROUNDS,
      locked_price_per_call: agent.price_per_call,
      last_activity_at: new Date().toISOString(),
    })
    .select("id, session_id")
    .single();

  if (taskError || !task) {
    throw new Error("invalid_task_state");
  }

  await createTaskEncryptionKey(task.id);
  await recordUserAgentUsage(userId, agentId);
  await invalidateUserRecommendations(userId);
  await invalidateSimilarRecommendations(agentId);

  await assignTaskToAgent({
    agentId,
    taskId: task.id,
    sessionId: task.session_id,
    type: "task_start",
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: task.id,
    type: "task:assigned",
    taskId: task.id,
    agentId,
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    type: "sync:navigate",
    taskId: task.id,
    href: `/tasks/${task.id}`,
  }).catch(() => {});

  void sendNotification(agent.owner_id, "agent_selected", {
    task_id: task.id,
    agent_id: agentId,
  });

  return task;
}

export async function createDirectTask({
  userId,
  agentId,
  prompt,
}: {
  userId: string;
  agentId: string;
  prompt: string;
}) {
  const supabase = createAdminClient();
  await ensureUserTaskCapacity(userId);
  await ensurePlatformTaskCapacity();
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, owner_id, status, active_tasks, max_concurrent, price_per_call, is_seed, seed_free_remaining, seed_max_rounds, quality_status")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error("agent_not_found");
  }

  if (agent.owner_id === userId) {
    throw new Error("self_hire_forbidden");
  }

  if (agent.status === "offline") {
    throw new Error("agent_offline");
  }

  if (agent.quality_status === "hidden") {
    throw new Error("agent_unavailable");
  }

  if (agent.status === "busy" || Number(agent.active_tasks ?? 0) >= Number(agent.max_concurrent ?? 1)) {
    throw new Error("agent_busy");
  }

  const isSeedTask = Boolean(agent.is_seed) && Number(agent.seed_free_remaining ?? 0) > 0;
  const lockedPrice = Number(agent.price_per_call ?? 0);

  if (!isSeedTask && lockedPrice > 0) {
    const balance = await getUserBalance(userId);
    if (balance < lockedPrice * Number(process.env.MIN_BALANCE_ROUNDS ?? 10)) {
      throw new Error("insufficient_balance");
    }
  }

  if (isSeedTask) {
    const { count } = await supabase
      .from("seed_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("agent_id", agentId);

    if ((count ?? 0) > 0) {
      throw new Error("seed_already_used");
    }
  }

  await acquireAgentSlot(agentId);

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      agent_id: agentId,
      session_id: randomUUID(),
      status: TASK_STATUS.ACTIVE,
      phase: isSeedTask ? TASK_PHASE.SEED : TASK_PHASE.PAID,
      is_seed_task: isSeedTask,
      is_direct: true,
      free_rounds: isSeedTask ? 0 : FREE_ROUNDS,
      locked_price_per_call: lockedPrice,
      seed_max_rounds: Number(agent.seed_max_rounds ?? 15),
      last_activity_at: new Date().toISOString(),
    })
    .select("id, session_id, is_seed_task, phase")
    .single();

  if (taskError || !task) {
    throw new Error("invalid_task_state");
  }

  await createTaskEncryptionKey(task.id);
  await recordUserAgentUsage(userId, agentId);
  await invalidateUserRecommendations(userId);
  await invalidateSimilarRecommendations(agentId);

  const taskKey = await getTaskEncryptionKey(task.id);
  await supabase.from("task_messages").insert({
    task_id: task.id,
    round_number: 1,
    role: "user",
    type: "text",
    content: encrypt(prompt, taskKey),
    is_free: isSeedTask || lockedPrice === 0,
    created_at: new Date().toISOString(),
  });

  if (isSeedTask) {
    await supabase.from("seed_usage").insert({
      user_id: userId,
      agent_id: agentId,
      task_id: task.id,
    });

    await supabase
      .from("agents")
      .update({
        seed_free_remaining: Math.max(Number(agent.seed_free_remaining ?? 1) - 1, 0),
      })
      .eq("id", agentId);
  }

  await assignTaskToAgent({
    agentId,
    taskId: task.id,
    sessionId: task.session_id,
    type: "task_start",
  }).catch(() => {});

  await sendRelayMessage({
    targetAgentId: agentId,
    type: "task_message",
    taskId: task.id,
    content: prompt,
    roundNumber: 1,
  }).catch(() => {});

  return {
    task_id: task.id,
    status: TASK_STATUS.ACTIVE,
    agent: {
      id: agent.id,
      price_per_call: agent.price_per_call,
    },
    phase: task.phase,
    is_seed_task: task.is_seed_task,
  };
}

export async function createSellerTestTask({
  agentId,
  ownerId,
}: {
  agentId: string;
  ownerId: string;
}) {
  return createPersistedSellerTestTask({
    agentId,
    ownerId,
  });
  /*
  const supabase = createAdminClient();
  const testPrompt = "This is a SummonAI connectivity test. Reply with a short acknowledgement.";
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: ownerId,
      agent_id: agentId,
      session_id: randomUUID(),
      status: TASK_STATUS.ACTIVE,
      phase: TASK_PHASE.PAID,
      is_seed_task: false,
      is_direct: true,
      is_test: true,
      free_rounds: 0,
      locked_price_per_call: 0,
      last_activity_at: new Date().toISOString(),
    })
    .select("id, session_id")
    .single();

  if (error || !task) {
    throw new Error("invalid_task_state");
  }

  await createTaskEncryptionKey(task.id);
  const taskKey = await getTaskEncryptionKey(task.id);
  await supabase.from("task_messages").insert({
    task_id: task.id,
    round_number: 1,
    role: "user",
    type: "text",
    content: encrypt(testPrompt, taskKey),
    is_free: true,
    created_at: new Date().toISOString(),
  });

  await startSellerTestSession({
    agentId,
    taskId: task.id,
    sessionId: task.session_id,
    prompt: testPrompt,
  }).catch(() => {});

  let sampledResults = {
    self_eval: false,
    streaming: false,
    done_signal: false,
    heartbeat: false,
  };
  const pollDeadline = Date.now() + Math.min(9_000, SELF_EVAL_TIMEOUT_MS + 4_000);

  while (Date.now() < pollDeadline) {
    const session = await getSellerTestSession(task.id).catch(() => null);
    const results = session?.results;

    if (results) {
      sampledResults = {
        self_eval: Boolean(results.self_eval),
        streaming: Boolean(results.streaming),
        done_signal: Boolean(results.done_signal),
        heartbeat: Boolean(results.heartbeat),
      };

      if (Object.values(sampledResults).every(Boolean)) {
        break;
      }
    }

    await sleep(1_000);
  }

  return {
    test_id: task.id,
    results: sampledResults,
  };

  /*
  await assignTaskToAgent({
    agentId,
    taskId: task.id,
    sessionId: task.session_id,
    type: "task_start",
  }).catch(() => {});

  await sendRelayMessage({
    targetAgentId: agentId,
    type: "broadcast",
    broadcastId: `test-${task.id}`,
    prompt: "这是一条测试消息",
    categories: [],
    is_test: true,
  }).catch(() => {});

  return {
    test_id: task.id,
    results: {
      self_eval: true,
      streaming: true,
      done_signal: true,
      heartbeat: true,
    },
  };
  */
}

export async function sendTaskMessage({
  taskId,
  userId,
  content,
}: {
  taskId: string;
  userId: string;
  content: string;
}) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id, status, round_count, phase, free_rounds, locked_price_per_call")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (!["confirming", "active", "paused"].includes(task.status)) {
    throw new Error("invalid_task_state");
  }

  const nextRound = Number(task.round_count ?? 0) + 1;
  const taskKey = await getTaskEncryptionKey(taskId);

  const { error } = await supabase.from("task_messages").insert({
    task_id: taskId,
    round_number: nextRound,
    role: "user",
    type: "text",
    content: encrypt(content, taskKey),
    is_free: task.phase === "confirmation" || Number(task.locked_price_per_call ?? 0) === 0,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error("validation_error");
  }

  await sendRelayMessage({
    targetAgentId: task.agent_id,
    type: "task_message",
    taskId,
    content,
    roundNumber: nextRound,
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "sync:input_lock",
    taskId,
    roundNumber: nextRound,
  }).catch(() => {});

  return {
    roundNumber: nextRound,
  };
}

export async function completeAgentRound({
  taskId,
  roundNumber,
  content,
}: {
  taskId: string;
  roundNumber: number;
  content: string;
}) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, phase, free_rounds")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  const taskKey = await getTaskEncryptionKey(taskId);

  await supabase.from("task_messages").insert({
    task_id: taskId,
    round_number: roundNumber,
    role: "agent",
    type: "text",
    content: encrypt(content, taskKey),
    is_free: task.phase === "confirmation",
    created_at: new Date().toISOString(),
  });

  const { data: roundResult, error: rpcError } = await supabase.rpc("record_round", {
    p_task_id: taskId,
    p_round_number: roundNumber,
  });

  if (rpcError) {
    throw new Error("validation_error");
  }

  await sendRelayMessage({
    targetUserId: task.user_id,
    targetTaskId: taskId,
    type: "task:round_recorded",
    taskId,
    roundNumber,
    result: roundResult,
  }).catch(() => {});

  if (
    typeof roundResult === "object" &&
    roundResult !== null &&
    "status" in roundResult &&
    roundResult.status === "confirmation_needed"
  ) {
    await sendRelayMessage({
      targetUserId: task.user_id,
      targetTaskId: taskId,
      type: "sync:state_refresh",
      taskId,
      state: "confirmation_needed",
    }).catch(() => {});
  }

  if (
    typeof roundResult === "object" &&
    roundResult !== null &&
    "status" in roundResult &&
    roundResult.status === "seed_limit_reached"
  ) {
    await endTask({
      taskId,
      userId: task.user_id,
      endReason: END_REASON.SEED_LIMIT_REACHED,
    });
  }

  await sendRelayMessage({
    targetUserId: task.user_id,
    targetTaskId: taskId,
    type: "sync:input_unlock",
    taskId,
    roundNumber,
  }).catch(() => {});

  return roundResult;
}

export async function confirmTaskAction({
  taskId,
  userId,
  action,
}: {
  taskId: string;
  userId: string;
  action: "continue" | "end";
}) {
  const supabase = createAdminClient();
  const task = await getTaskWithLifecycleContext(taskId);

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (task.status !== TASK_STATUS.CONFIRMING || task.phase !== TASK_PHASE.CONFIRMATION) {
    throw new Error("invalid_task_state");
  }

  if (action === "end") {
    return endTask({
      taskId,
      userId,
      endReason: END_REASON.CONFIRMATION_CANCELLED,
    });
  }

  const lockedPrice = Number(task.locked_price_per_call ?? 0);
  if (lockedPrice > 0 && !task.is_seed_task) {
    const balance = await getUserBalance(userId);
    const minRequired = lockedPrice * Number(process.env.MIN_BALANCE_ROUNDS ?? 10);

    if (balance < minRequired) {
      await sendRelayMessage({
        targetUserId: userId,
        targetTaskId: taskId,
        type: "task:balance_insufficient",
        taskId,
        grace_minutes: 10,
      }).catch(() => {});

      throw new Error("insufficient_balance");
    }
  }

  await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.ACTIVE,
      phase: task.is_seed_task ? TASK_PHASE.SEED : TASK_PHASE.PAID,
      pause_reason: null,
      pause_expires_at: null,
      paused_at: null,
      confirmed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "task:phase_changed",
    taskId,
    phase: task.is_seed_task ? TASK_PHASE.SEED : TASK_PHASE.PAID,
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "sync:state_refresh",
    taskId,
    state: "active",
  }).catch(() => {});

  return {
    status: "active",
  };
}

export async function pauseTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const pauseExpiresAt = minutesFromNow(Number(process.env.PAUSE_EXPIRY_DAYS ?? 3) * 24 * 60);

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.PAUSED,
      pause_reason: PAUSE_REASON.AWAIT_USER,
      paused_at: new Date().toISOString(),
      pause_expires_at: pauseExpiresAt,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .eq("status", TASK_STATUS.ACTIVE)
    .select("id")
    .single();

  if (error || !task) {
    throw new Error("invalid_task_state");
  }

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "task:paused",
    taskId,
    pause_reason: PAUSE_REASON.AWAIT_USER,
    pause_expires_at: pauseExpiresAt,
  }).catch(() => {});

  const lifecycleTask = await getTaskWithLifecycleContext(taskId);
  await decrementAgentActiveTasks(lifecycleTask.agent_id);

  return task;
}

export async function endTask({
  taskId,
  userId,
  endReason,
}: {
  taskId: string;
  userId: string;
  endReason: EndReason;
}) {
  const supabase = createAdminClient();
  const task = await getTaskWithLifecycleContext(taskId);

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  const nextStatus = getNextTaskStatusForEndReason(endReason);

  await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      end_reason: endReason,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (shouldSettleTask(endReason)) {
    try {
      await supabase.rpc("settle_task", {
        p_task_id: taskId,
      });
    } catch {
      // Settlement fallback is intentionally non-blocking for the end-task UX.
    }
  }

  if (shouldReleaseSlot({ currentStatus: task.status, currentPauseReason: task.pause_reason })) {
    await decrementAgentActiveTasks(task.agent_id);
  }

  if (!task.is_test && shouldIncrementTotalTasks(endReason)) {
    await incrementAgentTotalTasks(task.agent_id);
  }

  if (!task.is_test && shouldRecordHealthOnly(endReason)) {
    await recordHealthEvent(task.agent_id, "confirmation_disconnect_fault", {
      task_id: taskId,
      end_reason: endReason,
    });
  }

  await sendRelayMessage({
    targetAgentId: task.agent_id,
    type: "task_end",
    taskId,
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "sync:state_refresh",
    taskId,
    state: nextStatus,
    end_reason: endReason,
  }).catch(() => {});

  if (!task.is_test && task.is_seed_task && nextStatus === TASK_STATUS.COMPLETED) {
    await maybeHandleSeedGraduation(task.agent_id);
  }

  return {
    status: nextStatus,
  };
}

export async function resumeTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const task = await getTaskWithLifecycleContext(taskId);

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (task.status !== TASK_STATUS.PAUSED || !task.pause_reason) {
    throw new Error("invalid_task_state");
  }

  if (task.pause_reason === PAUSE_REASON.INSUFFICIENT_BALANCE) {
    const lockedPrice = Number(task.locked_price_per_call ?? 0);
    const balance = await getUserBalance(userId);

    if (lockedPrice > 0 && balance < lockedPrice) {
      throw new Error("insufficient_balance");
    }

    await supabase
      .from("tasks")
      .update({
        status: TASK_STATUS.ACTIVE,
        pause_reason: null,
        paused_at: null,
        pause_expires_at: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    await sendRelayMessage({
      targetUserId: userId,
      targetTaskId: taskId,
      type: "task:balance_recharged",
      taskId,
      new_balance: balance,
    }).catch(() => {});

    return {
      status: TASK_STATUS.ACTIVE,
      resumed_with_history: false,
    };
  }

  await acquireAgentSlot(task.agent_id);

  await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.ACTIVE,
      pause_reason: null,
      paused_at: null,
      pause_expires_at: null,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  const history = await buildConversationHistory(taskId);
  await assignTaskToAgent({
    agentId: task.agent_id,
    type: "task_resume",
    taskId,
    sessionId: history.sessionId,
    conversationHistory: history.conversationHistory,
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "agent:resumed_task",
    taskId,
    wait_minutes: Number(process.env.AGENT_RESUME_WAIT_MINUTES ?? 15),
  }).catch(() => {});

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "sync:state_refresh",
    taskId,
    state: TASK_STATUS.ACTIVE,
  }).catch(() => {});

  return {
    status: TASK_STATUS.ACTIVE,
    resumed_with_history: true,
  };
}

export async function cancelTask({
  taskId,
  userId,
  cancelReason,
  cancelReasonText,
}: {
  taskId: string;
  userId: string;
  cancelReason: "ability_mismatch" | "too_slow" | "need_changed" | "other";
  cancelReasonText?: string;
}) {
  const supabase = createAdminClient();
  const task = await getTaskWithLifecycleContext(taskId);

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (task.status !== TASK_STATUS.ACTIVE) {
    throw new Error("invalid_task_state");
  }

  const paidRounds = Number(task.paid_rounds ?? 0);
  const endReason =
    paidRounds <= 3
      ? END_REASON.USER_CANCELLED_BEFORE_PAID
      : END_REASON.USER_CANCELLED_AFTER_PAID;

  await supabase
    .from("tasks")
    .update({
      cancel_reason: cancelReason,
      cancel_reason_text: cancelReason === "other" ? cancelReasonText ?? null : null,
    })
    .eq("id", taskId);

  return endTask({
    taskId,
    userId,
    endReason,
  });
}

export async function stopTask({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  await sendRelayMessage({
    targetAgentId: task.agent_id,
    type: "task_stop",
    taskId,
  }).catch(() => {});

  return {
    status: "stopping",
  };
}

export async function handleDisconnectChoice({
  taskId,
  userId,
  choice,
}: {
  taskId: string;
  userId: string;
  choice: "wait" | "end";
}) {
  if (choice === "end") {
    return endTask({
      taskId,
      userId,
      endReason: END_REASON.DISCONNECT_ENDED,
    });
  }

  const supabase = createAdminClient();
  const task = await getTaskWithLifecycleContext(taskId);

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (!["active", "paused"].includes(task.status)) {
    throw new Error("invalid_task_state");
  }

  await supabase
    .from("tasks")
    .update({
      status: TASK_STATUS.PAUSED,
      pause_reason: PAUSE_REASON.DISCONNECT_AWAIT,
      paused_at: new Date().toISOString(),
      pause_expires_at: minutesFromNow(Number(process.env.AGENT_OFFLINE_AUTO_END_HOURS ?? 24) * 60),
    })
    .eq("id", taskId);

  if (task.status === TASK_STATUS.ACTIVE) {
    await decrementAgentActiveTasks(task.agent_id);
  }

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "task:paused",
    taskId,
    pause_reason: PAUSE_REASON.DISCONNECT_AWAIT,
    pause_expires_at: minutesFromNow(Number(process.env.AGENT_OFFLINE_AUTO_END_HOURS ?? 24) * 60),
  }).catch(() => {});

  return {
    status: TASK_STATUS.PAUSED,
  };
}
