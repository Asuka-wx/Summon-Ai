import { randomUUID } from "node:crypto";

import { calculateBidRank } from "@/lib/protocol/bid-rank";
import {
  BROADCAST_WINDOW_SECONDS,
  FREE_ROUNDS,
  MAX_BID_PITCH_LENGTH,
} from "@/lib/protocol/matchmaking";
import { sendNotification } from "@/lib/notifications/service";
import { sendRelayMessage, broadcastToAgents, assignTaskToAgent } from "@/lib/realtime/relay-client";
import { encrypt } from "@/lib/security/encryption";
import { createTaskEncryptionKey, getTaskEncryptionKey } from "@/lib/security/task-encryption-keys";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { count: activeTaskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["confirming", "active", "paused"]);

  if ((activeTaskCount ?? 0) >= Number(process.env.MAX_ACTIVE_TASKS_PER_USER ?? 5)) {
    throw new Error("invalid_task_state");
  }

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
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id, status, phase, locked_price_per_call, is_seed_task, session_id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (task.status !== "confirming") {
    throw new Error("invalid_task_state");
  }

  if (action === "end") {
    const { data: agent } = await supabase
      .from("agents")
      .select("active_tasks")
      .eq("id", task.agent_id)
      .single();

    await supabase
      .from("tasks")
      .update({
        status: "completed",
        end_reason: "confirmation_cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    await supabase
      .from("agents")
      .update({
        active_tasks: Math.max(Number(agent?.active_tasks ?? 1) - 1, 0),
        status: "online",
      })
      .eq("id", task.agent_id);

    await sendRelayMessage({
      targetAgentId: task.agent_id,
      type: "task_end",
      taskId,
    }).catch(() => {});

    return {
      status: "ended",
    };
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
      status: "active",
      phase: task.is_seed_task ? "seed" : "paid",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

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
  const pauseExpiresAt = minutesFromNow(Number(process.env.IDLE_PAUSE_MINUTES ?? 15));

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      status: "paused",
      pause_reason: "await_user",
      paused_at: new Date().toISOString(),
      pause_expires_at: pauseExpiresAt,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .in("status", ["confirming", "active"])
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
    pause_reason: "await_user",
    pause_expires_at: pauseExpiresAt,
  }).catch(() => {});

  return task;
}

export async function endTask({
  taskId,
  userId,
  endReason,
}: {
  taskId: string;
  userId: string;
  endReason: string;
}) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  await supabase
    .from("tasks")
    .update({
      status: "completed",
      end_reason: endReason,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  try {
    await supabase.rpc("settle_task", {
      p_task_id: taskId,
    });
  } catch {
    // Settlement fallback is intentionally non-blocking for the end-task UX.
  }

  const { data: agent } = await supabase.from("agents").select("active_tasks").eq("id", task.agent_id).single();
  await supabase
    .from("agents")
    .update({
      active_tasks: Math.max(Number(agent?.active_tasks ?? 1) - 1, 0),
      status: "online",
    })
    .eq("id", task.agent_id);

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
    state: "completed",
  }).catch(() => {});

  return {
    status: "completed",
  };
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
      endReason: "disconnect_ended",
    });
  }

  await sendRelayMessage({
    targetUserId: userId,
    targetTaskId: taskId,
    type: "agent:resumed_task",
    taskId,
    wait_minutes: Number(process.env.AGENT_RESUME_WAIT_MINUTES ?? 15),
  }).catch(() => {});

  return {
    status: "waiting",
  };
}
