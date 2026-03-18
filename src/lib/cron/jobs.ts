import { createErrorResponse } from "@/lib/api-error";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { recordCronHeartbeatFailure, recordCronHeartbeatSuccess } from "@/lib/cron/heartbeats";
import { cleanupExpiredConversations } from "@/lib/security/conversation-cleanup";
import {
  getConcurrencyDowngradeHealth,
  getConcurrencyObservationWindow,
  shouldDowngradeConcurrency,
} from "@/lib/runtime/concurrency";
import { createAdminClient } from "@/lib/supabase/admin";

export const CRON_JOB_SCHEDULES = {
  "stale-task-cleanup": {
    expectedInterval: "10 minutes",
  },
  "health-recalc": {
    expectedInterval: "6 hours",
  },
  "ranking-reset-weekly": {
    expectedInterval: "7 days",
  },
  "settlement-confirm": {
    expectedInterval: "5 minutes",
  },
  "stuck-withdrawal-check": {
    expectedInterval: "10 minutes",
  },
  "deletion-warning": {
    expectedInterval: "1 hour",
  },
  "report-expiry": {
    expectedInterval: "24 hours",
  },
  "conversation-cleanup": {
    expectedInterval: "60 minutes",
  },
} as const;

export type CronJobName = keyof typeof CRON_JOB_SCHEDULES;

type CronJobResult = Record<string, unknown>;

type CronJobHandler = () => Promise<CronJobResult>;

async function runHealthRecalcJob() {
  const supabase = createAdminClient();
  const batchSize = Number(process.env.HEALTH_RECALC_BATCH_SIZE ?? 50);
  const observationWindow = getConcurrencyObservationWindow();
  const downgradedAgentIds: string[] = [];

  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, concurrency_level, health_score, concurrency_upgraded_at")
    .gt("concurrency_level", 1)
    .order("concurrency_upgraded_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Failed to load agents for health recalculation: ${error.message}`);
  }

  for (const agent of agents ?? []) {
    const { data: recentTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("agent_id", agent.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(observationWindow);

    if (tasksError) {
      throw new Error(`Failed to load recent tasks for agent ${agent.id}: ${tasksError.message}`);
    }

    const observationTaskCount = recentTasks?.length ?? 0;
    const recentHealthScore = Number(agent.health_score ?? 0);

    if (
      shouldDowngradeConcurrency({
        observationTaskCount,
        recentHealthScore,
      })
    ) {
      const nextLevel = Math.max(1, Number(agent.concurrency_level ?? 1) - 1);

      const { error: updateError } = await supabase
        .from("agents")
        .update({
          concurrency_level: nextLevel,
          concurrency_upgraded_at: new Date().toISOString(),
        })
        .eq("id", agent.id);

      if (updateError) {
        throw new Error(`Failed to downgrade concurrency for agent ${agent.id}: ${updateError.message}`);
      }

      downgradedAgentIds.push(agent.id);
    }

    await supabase.from("agent_daily_stats").upsert(
      {
        agent_id: agent.id,
        stat_date: new Date().toISOString().slice(0, 10),
        health_score_snapshot: recentHealthScore,
      },
      {
        onConflict: "agent_id,stat_date",
      },
    );
  }

  return {
    processed_agents: agents?.length ?? 0,
    downgraded_agent_ids: downgradedAgentIds,
    downgrade_health_threshold: getConcurrencyDowngradeHealth(),
  };
}

async function runStaleTaskCleanupJob() {
  const supabase = createAdminClient();
  const maxRetiringDays = Number(process.env.RETIRING_MAX_DAYS ?? 7);
  const retiringCutoff = new Date(Date.now() - maxRetiringDays * 24 * 60 * 60 * 1000).toISOString();
  const archivedAgentIds: string[] = [];
  const forcedTaskEnds: string[] = [];

  const { data: agents, error } = await supabase
    .from("agents")
    .select("id, updated_at")
    .eq("status", "retiring");

  if (error) {
    throw new Error(`Failed to list retiring agents: ${error.message}`);
  }

  for (const agent of agents ?? []) {
    const { data: activeTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("agent_id", agent.id)
      .in("status", ["active", "paused"]);

    if (tasksError) {
      throw new Error(`Failed to load tasks for retiring agent ${agent.id}: ${tasksError.message}`);
    }

    if ((activeTasks?.length ?? 0) === 0) {
      await supabase.from("agents").update({ status: "archived" }).eq("id", agent.id);
      archivedAgentIds.push(agent.id);
      continue;
    }

    if (agent.updated_at && agent.updated_at < retiringCutoff) {
      const activeTaskIds = (activeTasks ?? []).map((task) => task.id);

      if (activeTaskIds.length > 0) {
        await supabase
          .from("tasks")
          .update({
            status: "completed",
            end_reason: "agent_retired",
            completed_at: new Date().toISOString(),
          })
          .in("id", activeTaskIds);

        forcedTaskEnds.push(...activeTaskIds);
      }

      await supabase.from("agents").update({ status: "archived" }).eq("id", agent.id);
      archivedAgentIds.push(agent.id);
    }
  }

  return {
    retiring_agents_checked: agents?.length ?? 0,
    archived_agent_ids: archivedAgentIds,
    forced_task_end_ids: forcedTaskEnds,
  };
}

async function runRankingResetWeeklyJob() {
  const supabase = createAdminClient();
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);

  const { error } = await supabase.from("ranking_snapshots").insert({
    period: "weekly",
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    board_type: "overall",
    category: null,
    rankings: [],
  });

  if (error) {
    throw new Error(`Failed to insert weekly ranking snapshot: ${error.message}`);
  }

  return {
    snapshot_period_start: start.toISOString().slice(0, 10),
    snapshot_period_end: end.toISOString().slice(0, 10),
  };
}

async function runSettlementConfirmJob() {
  const supabase = createAdminClient();
  const batchSize = Number(process.env.SETTLEMENT_CONFIRM_BATCH_SIZE ?? 20);

  const [{ data: pendingPayments, error: paymentsError }, { data: processingWithdrawals, error: withdrawalsError }] =
    await Promise.all([
      supabase.from("payments").select("id, type, tx_hash, status").eq("status", "pending").limit(batchSize),
      supabase
        .from("withdrawals")
        .select("id, status, tx_hash")
        .eq("status", "processing")
        .limit(batchSize),
    ]);

  if (paymentsError) {
    throw new Error(`Failed to load pending payments: ${paymentsError.message}`);
  }

  if (withdrawalsError) {
    throw new Error(`Failed to load processing withdrawals: ${withdrawalsError.message}`);
  }

  return {
    pending_payment_count: pendingPayments?.length ?? 0,
    processing_withdrawal_count: processingWithdrawals?.length ?? 0,
    status: "queued_for_confirmation",
  };
}

async function runStuckWithdrawalCheckJob() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: withdrawals, error } = await supabase
    .from("withdrawals")
    .select("id, user_id, created_at")
    .eq("status", "processing")
    .lt("created_at", cutoff);

  if (error) {
    throw new Error(`Failed to load stuck withdrawals: ${error.message}`);
  }

  const stuckIds = (withdrawals ?? []).map((withdrawal) => withdrawal.id);

  if (stuckIds.length > 0) {
    await supabase
      .from("withdrawals")
      .update({
        status: "stuck",
        stuck_at: new Date().toISOString(),
      })
      .in("id", stuckIds);
  }

  return {
    stuck_withdrawal_ids: stuckIds,
  };
}

async function runDeletionWarningJob() {
  const supabase = createAdminClient();
  const deleteAfterHours = Number(process.env.CONVERSATION_DELETE_HOURS ?? 24);
  const warningLeadHours = Number(process.env.DELETION_WARNING_HOURS ?? 4);
  const start = new Date(Date.now() - (deleteAfterHours - warningLeadHours) * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() - (deleteAfterHours - warningLeadHours + 1) * 60 * 60 * 1000).toISOString();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, user_id")
    .eq("status", "completed")
    .eq("deletion_warned", false)
    .gte("completed_at", end)
    .lte("completed_at", start);

  if (error) {
    throw new Error(`Failed to load tasks for deletion warning: ${error.message}`);
  }

  const warnedTaskIds = (tasks ?? []).map((task) => task.id);

  if (warnedTaskIds.length > 0) {
    await supabase.from("tasks").update({ deletion_warned: true }).in("id", warnedTaskIds);
    await supabase.from("notifications").insert(
      (tasks ?? []).map((task) => ({
        user_id: task.user_id,
        type: "conversation_deletion_warning",
        title: "Conversation will be deleted soon",
        body: "This task conversation will be deleted soon unless the task is under report review.",
        metadata: {
          task_id: task.id,
        },
      })),
    );
  }

  return {
    warned_task_ids: warnedTaskIds,
  };
}

async function runReportExpiryJob() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (error) {
    throw new Error(`Failed to load reports for expiry: ${error.message}`);
  }

  const reportIds = (reports ?? []).map((report) => report.id);

  if (reportIds.length > 0) {
    await supabase.from("reports").update({ status: "resolved_dismissed" }).in("id", reportIds);
  }

  return {
    expired_report_ids: reportIds,
  };
}

const CRON_JOB_HANDLERS: Record<CronJobName, CronJobHandler> = {
  "stale-task-cleanup": runStaleTaskCleanupJob,
  "health-recalc": runHealthRecalcJob,
  "ranking-reset-weekly": runRankingResetWeeklyJob,
  "settlement-confirm": runSettlementConfirmJob,
  "stuck-withdrawal-check": runStuckWithdrawalCheckJob,
  "deletion-warning": runDeletionWarningJob,
  "report-expiry": runReportExpiryJob,
  "conversation-cleanup": cleanupExpiredConversations,
};

export function isCronJobName(jobName: string): jobName is CronJobName {
  return jobName in CRON_JOB_HANDLERS;
}

export async function executeCronJob(jobName: CronJobName, request: Request) {
  const authError = authorizeCronRequest(request);

  if (authError) {
    return authError;
  }

  const jobConfig = CRON_JOB_SCHEDULES[jobName];

  try {
    const result = await CRON_JOB_HANDLERS[jobName]();
    await recordCronHeartbeatSuccess(jobName, jobConfig.expectedInterval);

    return Response.json({
      job: jobName,
      status: "ok",
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown cron error.";

    await recordCronHeartbeatFailure(jobName, jobConfig.expectedInterval, errorMessage).catch(() => {
      // Ignore heartbeat persistence failures so we can still surface the original cron failure.
    });

    return createErrorResponse(
      503,
      "platform_at_capacity",
      `Cron job ${jobName} failed.`,
      {
        reason: errorMessage,
      },
    );
  }
}
