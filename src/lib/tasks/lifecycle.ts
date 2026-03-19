import { createAdminClient } from "@/lib/supabase/admin";

export const TASK_STATUS = {
  CONFIRMING: "confirming",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const TASK_PHASE = {
  CONFIRMATION: "confirmation",
  PAID: "paid",
  SEED: "seed",
} as const;

export const PAUSE_REASON = {
  IDLE: "idle",
  DISCONNECT_AWAIT: "disconnect_await",
  INSUFFICIENT_BALANCE: "insufficient_balance",
  AWAIT_USER: "await_user",
} as const;

export const END_REASON = {
  USER_ENDED: "user_ended",
  DISCONNECT_ENDED: "disconnect_ended",
  PAUSE_ENDED: "pause_ended",
  BALANCE_ENDED: "balance_ended",
  CONFIRMATION_CANCELLED: "confirmation_cancelled",
  CONFIRMATION_DISCONNECT: "confirmation_disconnect",
  USER_CANCELLED_BEFORE_PAID: "user_cancelled_before_paid",
  USER_CANCELLED_AFTER_PAID: "user_cancelled_after_paid",
  AGENT_OFFLINE_24H: "agent_offline_24h",
  BALANCE_EXPIRED: "balance_expired",
  CONFIRMATION_TIMEOUT: "confirmation_timeout",
  PAUSE_EXPIRED: "pause_expired",
  AGENT_RETIRED: "agent_retired",
  USER_DELETED: "user_deleted",
  USER_BANNED: "user_banned",
  CONSECUTIVE_TIMEOUT: "consecutive_timeout",
  SEED_LIMIT_REACHED: "seed_limit_reached",
} as const;

export type EndReason = (typeof END_REASON)[keyof typeof END_REASON];
export type PauseReason = (typeof PAUSE_REASON)[keyof typeof PAUSE_REASON];
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

const COMPLETED_REASONS = new Set<EndReason>([
  END_REASON.USER_ENDED,
  END_REASON.DISCONNECT_ENDED,
  END_REASON.PAUSE_ENDED,
  END_REASON.BALANCE_ENDED,
  END_REASON.SEED_LIMIT_REACHED,
]);

const CANCELLATION_REASONS = new Set<EndReason>([
  END_REASON.USER_CANCELLED_BEFORE_PAID,
  END_REASON.USER_CANCELLED_AFTER_PAID,
  END_REASON.AGENT_OFFLINE_24H,
  END_REASON.CONSECUTIVE_TIMEOUT,
  END_REASON.BALANCE_EXPIRED,
  END_REASON.PAUSE_EXPIRED,
  END_REASON.CONFIRMATION_CANCELLED,
  END_REASON.CONFIRMATION_TIMEOUT,
  END_REASON.CONFIRMATION_DISCONNECT,
  END_REASON.AGENT_RETIRED,
  END_REASON.USER_DELETED,
  END_REASON.USER_BANNED,
]);

const EXCLUDED_FROM_TOTAL_TASKS = new Set<EndReason>([
  END_REASON.CONFIRMATION_CANCELLED,
  END_REASON.CONFIRMATION_TIMEOUT,
  END_REASON.AGENT_RETIRED,
  END_REASON.USER_DELETED,
  END_REASON.USER_BANNED,
]);

const HEALTH_ONLY_REASONS = new Set<EndReason>([
  END_REASON.CONFIRMATION_DISCONNECT,
]);

const REQUIRES_SETTLEMENT = new Set<EndReason>([
  END_REASON.USER_ENDED,
  END_REASON.DISCONNECT_ENDED,
  END_REASON.PAUSE_ENDED,
  END_REASON.BALANCE_ENDED,
  END_REASON.USER_CANCELLED_BEFORE_PAID,
  END_REASON.USER_CANCELLED_AFTER_PAID,
  END_REASON.AGENT_OFFLINE_24H,
  END_REASON.CONSECUTIVE_TIMEOUT,
  END_REASON.BALANCE_EXPIRED,
  END_REASON.PAUSE_EXPIRED,
  END_REASON.SEED_LIMIT_REACHED,
  END_REASON.AGENT_RETIRED,
  END_REASON.USER_DELETED,
  END_REASON.USER_BANNED,
]);

export function getNextTaskStatusForEndReason(endReason: EndReason): TaskStatus {
  if (COMPLETED_REASONS.has(endReason)) {
    return TASK_STATUS.COMPLETED;
  }

  if (CANCELLATION_REASONS.has(endReason)) {
    return TASK_STATUS.CANCELLED;
  }

  return TASK_STATUS.CANCELLED;
}

export function shouldSettleTask(endReason: EndReason) {
  return REQUIRES_SETTLEMENT.has(endReason);
}

export function shouldIncrementTotalTasks(endReason: EndReason) {
  return !EXCLUDED_FROM_TOTAL_TASKS.has(endReason) && !HEALTH_ONLY_REASONS.has(endReason);
}

export function shouldRecordHealthOnly(endReason: EndReason) {
  return HEALTH_ONLY_REASONS.has(endReason);
}

export function shouldReleaseSlot({
  currentStatus,
  currentPauseReason,
}: {
  currentStatus: string;
  currentPauseReason: string | null;
}) {
  if (currentStatus === TASK_STATUS.CONFIRMING) {
    return false;
  }

  if (
    currentStatus === TASK_STATUS.PAUSED &&
    currentPauseReason !== PAUSE_REASON.INSUFFICIENT_BALANCE
  ) {
    return false;
  }

  return true;
}

export async function decrementAgentActiveTasks(agentId: string) {
  const supabase = createAdminClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("active_tasks")
    .eq("id", agentId)
    .single();

  await supabase
    .from("agents")
    .update({
      active_tasks: Math.max(Number(agent?.active_tasks ?? 1) - 1, 0),
      status: "online",
    })
    .eq("id", agentId);
}

export async function incrementAgentTotalTasks(agentId: string) {
  const supabase = createAdminClient();

  try {
    await supabase.rpc("increment_agent_total_tasks", {
      p_agent_id: agentId,
    });
  } catch {
    const { data: agent } = await supabase
      .from("agents")
      .select("total_tasks, quality_tasks_since_change")
      .eq("id", agentId)
      .single();

    await supabase
      .from("agents")
      .update({
        total_tasks: Number(agent?.total_tasks ?? 0) + 1,
        quality_tasks_since_change: Number(agent?.quality_tasks_since_change ?? 0) + 1,
      })
      .eq("id", agentId);
  }
}

export async function recordHealthEvent(agentId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  const supabase = createAdminClient();

  await supabase.from("audit_logs").insert({
    event_type: eventType,
    agent_id: agentId,
    amount: 0,
    metadata,
  });
}
