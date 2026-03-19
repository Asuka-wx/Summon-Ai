import { createErrorResponse } from "@/lib/api-error";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { recordCronHeartbeatFailure, recordCronHeartbeatSuccess } from "@/lib/cron/heartbeats";
import {
  createBalanceAuditSnapshot,
  getGasStatus,
  notifyWithdrawalStatus,
} from "@/lib/payments/service";
import { sendNotification, sendWeeklyReports } from "@/lib/notifications/service";
import { updateCategoryBenchmarks } from "@/lib/quality/benchmarks";
import { getDisplayThresholdsConfig, getQualityControlConfig } from "@/lib/quality/config";
import {
  applyNewbieAndSmallSampleProtection,
  calculateHealthScoreRaw,
  resolveNextQualityStatus,
} from "@/lib/quality/health";
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
  "timeout-check": {
    expectedInterval: "5 minutes",
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
  "balance-audit": {
    expectedInterval: "5 minutes",
  },
  "gas-monitor": {
    expectedInterval: "1 hour",
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
  "supabase-keepalive": {
    expectedInterval: "2 days",
  },
  "anomaly-scan": {
    expectedInterval: "1 hour",
  },
  "badge-scan": {
    expectedInterval: "24 hours",
  },
  "leaderboard-archive": {
    expectedInterval: "7 days",
  },
  "tx-confirm": {
    expectedInterval: "5 minutes",
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
  const qualityControl = await getQualityControlConfig();
  const displayThresholds = await getDisplayThresholdsConfig();

  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      "id, concurrency_level, health_score, concurrency_upgraded_at, total_tasks, completion_rate, cancel_rate, fault_rate, quality_status, status, categories, avg_rating, avg_response_time_ms",
    )
    .order("concurrency_upgraded_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Failed to load agents for health recalculation: ${error.message}`);
  }

  for (const agent of agents ?? []) {
    const { data: recentTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, status, end_reason")
      .eq("agent_id", agent.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(observationWindow);

    if (tasksError) {
      throw new Error(`Failed to load recent tasks for agent ${agent.id}: ${tasksError.message}`);
    }

    const observationTaskCount = recentTasks?.length ?? 0;

    const { data: sevenDayStats } = await supabase
      .from("agent_daily_stats")
      .select("online_seconds, tasks_completed, tasks_created")
      .eq("agent_id", agent.id)
      .gte("stat_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    const { data: recentMessages } = await supabase
      .from("task_messages")
      .select("response_time_ms, is_fault")
      .in(
        "task_id",
        (recentTasks ?? []).map((task) => task.id),
      );

    const { data: recentRatings } = await supabase
      .from("ratings")
      .select("rating, user_weight")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const uptimeMinutes =
      (sevenDayStats ?? []).reduce(
        (sum, row) => sum + Number(row.online_seconds ?? 0),
        0,
      ) / 60;
    const uptimeScore = Math.max(0, Math.min(100, (uptimeMinutes / (7 * 24 * 60)) * 100));
    const totalRounds = (recentMessages ?? []).length;
    const timeoutCount = (recentMessages ?? []).filter((message) => message.is_fault).length;
    const responseScore =
      totalRounds === 0 ? 100 : Math.max(0, (1 - timeoutCount / totalRounds) * 100);
    const completionScore = Number(agent.completion_rate ?? 0);
    const cancelScore = Math.max(0, 100 - Number(agent.cancel_rate ?? 0));
    const reportScore = Math.max(0, 100 - Number(agent.fault_rate ?? 0));
    const rawHealthScore = calculateHealthScoreRaw({
      uptimeScore,
      responseScore,
      completionScore,
      cancelScore,
      reportScore,
    });
    const recentHealthScore = applyNewbieAndSmallSampleProtection({
      totalTasks: Number(agent.total_tasks ?? 0),
      sevenDayTaskCount: observationTaskCount,
      rawHealthScore,
      newbieProtectionTasks: qualityControl.newbie_protection_tasks,
      smallSampleBaseScore: qualityControl.small_sample_base_score,
      smallSampleMinTasks: qualityControl.small_sample_min_tasks,
    });

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

    const currentQualityStatus = (agent.quality_status ?? "normal") as
      | "normal"
      | "warned"
      | "demoted"
      | "hidden"
      | "recovery_pending";

    const nextQualityStatus = resolveNextQualityStatus({
      currentStatus: currentQualityStatus,
      healthScore: recentHealthScore,
      observationWeeks: 3,
      observedTaskCount: observationTaskCount,
      downgradeWeeks: qualityControl.downgrade_weeks,
      downgradeMinTasks: qualityControl.downgrade_min_tasks,
      downgradeHealthThreshold: qualityControl.downgrade_health_threshold,
      upgradeWeeksHiddenToDemoted: qualityControl.upgrade_weeks_hidden_to_demoted,
      upgradeWeeksDemotedToWarned: qualityControl.upgrade_weeks_demoted_to_warned,
      upgradeWeeksWarnedToNormal: qualityControl.upgrade_weeks_warned_to_normal,
      upgradeMinTasks: qualityControl.upgrade_min_tasks,
      upgradeHealthThreshold: qualityControl.upgrade_health_threshold,
    });

    const effectiveStatus =
      recentHealthScore < qualityControl.auto_pause_health_threshold
        ? agent.status === "retiring"
          ? "retiring"
          : "offline"
        : agent.status;

    await supabase
      .from("agents")
      .update({
        health_score: recentHealthScore,
        quality_status: nextQualityStatus,
        quality_status_changed_at:
          nextQualityStatus !== agent.quality_status ? new Date().toISOString() : agent.concurrency_upgraded_at,
        avg_response_time_ms:
          Number(agent.total_tasks ?? 0) < 5
            ? 0
            : Math.round(
                (recentMessages ?? [])
                  .filter((message) => !message.is_fault && message.response_time_ms !== null)
                  .reduce((sum, message) => sum + Number(message.response_time_ms ?? 0), 0) /
                  Math.max(
                    1,
                    (recentMessages ?? []).filter(
                      (message) => !message.is_fault && message.response_time_ms !== null,
                    ).length,
                  ),
              ),
        avg_rating:
          Number(agent.total_tasks ?? 0) < 5
            ? Number(agent.avg_rating ?? 0)
            : Number(
                (
                  (recentRatings ?? []).reduce(
                    (sum, rating) => sum + Number(rating.rating ?? 0) * Number(rating.user_weight ?? 1),
                    0,
                  ) /
                  Math.max(
                    1,
                    (recentRatings ?? []).reduce(
                      (sum, rating) => sum + Number(rating.user_weight ?? 1),
                      0,
                    ),
                  )
                ).toFixed(2),
              ),
        status: effectiveStatus,
      })
      .eq("id", agent.id);

    if (nextQualityStatus !== currentQualityStatus) {
      const { data: owner } = await supabase
        .from("agents")
        .select("owner_id")
        .eq("id", agent.id)
        .single();

      if (owner?.owner_id) {
        void sendNotification(
          owner.owner_id,
          nextQualityStatus === "normal" ? "quality_restored" : "quality_warning",
          {
            agent_id: agent.id,
            quality_status: nextQualityStatus,
          },
        );
      }
    }

    await supabase.from("agent_daily_stats").upsert(
      {
        agent_id: agent.id,
        stat_date: new Date().toISOString().slice(0, 10),
        health_score_snapshot: recentHealthScore,
        avg_rating_today:
          recentRatings && recentRatings.length > 0
            ? Number(
                (
                  recentRatings.reduce(
                    (sum, rating) => sum + Number(rating.rating ?? 0) * Number(rating.user_weight ?? 1),
                    0,
                  ) /
                  Math.max(
                    1,
                    recentRatings.reduce(
                      (sum, rating) => sum + Number(rating.user_weight ?? 1),
                      0,
                    ),
                  )
                ).toFixed(2),
              )
            : null,
      },
      {
        onConflict: "agent_id,stat_date",
      },
    );
  }

  await updateCategoryBenchmarks();
  await supabase.from("platform_config").upsert(
    {
      key: "display_thresholds",
      value: displayThresholds,
      description: "Display thresholds for showcase and leaderboard rendering.",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "key",
    },
  );

  return {
    processed_agents: agents?.length ?? 0,
    downgraded_agent_ids: downgradedAgentIds,
    downgrade_health_threshold: getConcurrencyDowngradeHealth(),
    quality_control: qualityControl,
  };
}

async function runTimeoutCheckJob() {
  const supabase = createAdminClient();
  const idlePauseMinutes = Number(process.env.IDLE_PAUSE_MINUTES ?? 15);
  const disconnectGraceSeconds = Number(process.env.DISCONNECT_GRACE_SECONDS ?? 60);
  const insufficientBalanceGraceMinutes = Number(
    process.env.INSUFFICIENT_BALANCE_GRACE_MINUTES ?? 10,
  );
  const pauseExpiryDays = Number(process.env.PAUSE_EXPIRY_DAYS ?? 3);
  const now = new Date();

  const idleCutoff = new Date(now.getTime() - idlePauseMinutes * 60 * 1000).toISOString();
  const disconnectCutoff = new Date(now.getTime() - disconnectGraceSeconds * 1000).toISOString();
  const balanceCutoff = new Date(
    now.getTime() - insufficientBalanceGraceMinutes * 60 * 1000,
  ).toISOString();
  const pauseExpiryCutoff = new Date(now.getTime() - pauseExpiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: idleTasks } = await supabase
    .from("tasks")
    .update({
      status: "paused",
      pause_reason: "idle",
      paused_at: now.toISOString(),
      pause_expires_at: new Date(now.getTime() + pauseExpiryDays * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("status", "active")
    .lt("last_activity_at", idleCutoff)
    .select("id, user_id");

  const { data: balanceExpiredTasks } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      end_reason: "balance_expired",
      completed_at: now.toISOString(),
    })
    .eq("status", "paused")
    .eq("pause_reason", "insufficient_balance")
    .lt("paused_at", balanceCutoff)
    .select("id, agent_id");

  const { data: disconnectExpiredTasks } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      end_reason: "disconnect_ended",
      completed_at: now.toISOString(),
    })
    .eq("status", "paused")
    .eq("pause_reason", "disconnect_await")
    .lt("paused_at", disconnectCutoff)
    .select("id, agent_id");

  const { data: pauseExpiredTasks } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      end_reason: "pause_expired",
      completed_at: now.toISOString(),
    })
    .eq("status", "paused")
    .lt("paused_at", pauseExpiryCutoff)
    .select("id, agent_id");

  const releasedAgentIds = [
    ...new Set(
      [
        ...(balanceExpiredTasks ?? []).map((task) => task.agent_id),
        ...(disconnectExpiredTasks ?? []).map((task) => task.agent_id),
        ...(pauseExpiredTasks ?? []).map((task) => task.agent_id),
      ].filter(Boolean),
    ),
  ];

  for (const agentId of releasedAgentIds) {
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

  return {
    idle_paused_task_ids: (idleTasks ?? []).map((task) => task.id),
    balance_expired_task_ids: (balanceExpiredTasks ?? []).map((task) => task.id),
    disconnect_expired_task_ids: (disconnectExpiredTasks ?? []).map((task) => task.id),
    pause_expired_task_ids: (pauseExpiredTasks ?? []).map((task) => task.id),
  };
}

async function runStaleTaskCleanupJob() {
  const supabase = createAdminClient();
  const maxRetiringDays = Number(process.env.RETIRING_MAX_DAYS ?? 7);
  const retiringCutoff = new Date(Date.now() - maxRetiringDays * 24 * 60 * 60 * 1000).toISOString();
  const selectionCutoff = new Date().toISOString();
  const confirmationCutoff = new Date(
    Date.now() - Number(process.env.CONFIRMATION_TIMEOUT_MINUTES ?? 10) * 60 * 1000,
  ).toISOString();
  const archivedAgentIds: string[] = [];
  const forcedTaskEnds: string[] = [];

  const { data: expiredBroadcasts } = await supabase
    .from("broadcasts")
    .update({
      status: "expired",
    })
    .eq("status", "bidding")
    .lt("selection_expires_at", selectionCutoff)
    .select("id");

  const { data: confirmationTimedOutTasks } = await supabase
    .from("tasks")
    .update({
      status: "cancelled",
      end_reason: "confirmation_timeout",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "confirming")
    .lt("created_at", confirmationCutoff)
    .select("id, agent_id");

  const { data: expiredPausedTasks } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      end_reason: "pause_expired",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "paused")
    .lt("pause_expires_at", selectionCutoff)
    .select("id, agent_id");

  const releasedAgentIds = [
    ...new Set(
      [
        ...(confirmationTimedOutTasks ?? []).map((task) => task.agent_id),
        ...(expiredPausedTasks ?? []).map((task) => task.agent_id),
      ].filter(Boolean),
    ),
  ];

  for (const agentId of releasedAgentIds) {
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
    expired_broadcast_ids: (expiredBroadcasts ?? []).map((broadcast) => broadcast.id),
    confirmation_timeout_task_ids: (confirmationTimedOutTasks ?? []).map((task) => task.id),
    pause_expired_task_ids: (expiredPausedTasks ?? []).map((task) => task.id),
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

  await sendWeeklyReports();

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

    for (const withdrawal of withdrawals ?? []) {
      void notifyWithdrawalStatus({
        userId: withdrawal.user_id,
        withdrawalId: withdrawal.id,
        status: "stuck",
      });
    }
  }

  return {
    stuck_withdrawal_ids: stuckIds,
  };
}

async function runBalanceAuditJob() {
  return createBalanceAuditSnapshot();
}

async function runGasMonitorJob() {
  const supabase = createAdminClient();
  const gasStatus = await getGasStatus();

  if (gasStatus.level === "warning" || gasStatus.level === "critical") {
    await supabase.from("admin_alerts").insert({
      alert_type: gasStatus.level === "critical" ? "gas_critical" : "gas_warning",
      severity: gasStatus.level === "critical" ? "critical" : "medium",
      title:
        gasStatus.level === "critical"
          ? "Platform gas level is critical"
          : "Platform gas level is low",
      description: "Platform gas wallet balance dropped below the configured threshold.",
      payload: gasStatus,
    });
  }

  return gasStatus;
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

    for (const task of tasks ?? []) {
      void sendNotification(task.user_id, "deletion_warning", {
        task_id: task.id,
      });
    }
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

async function runSupabaseKeepaliveJob() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_config").select("key").limit(1);

  if (error) {
    throw new Error(`Supabase keepalive failed: ${error.message}`);
  }

  return {
    status: "ok",
  };
}

async function runAnomalyScanJob() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: suspiciousBroadcasts } = await supabase
    .from("broadcasts")
    .select("id, user_id")
    .gte("created_at", cutoff);

  const alertIds: string[] = [];

  if ((suspiciousBroadcasts?.length ?? 0) > Number(process.env.GLOBAL_BROADCAST_RATE_LIMIT ?? 200)) {
    const { data } = await supabase
      .from("admin_alerts")
      .insert({
        alert_type: "anomaly_scan_broadcast_spike",
        severity: "medium",
        title: "Broadcast spike detected",
        description: "Broadcast volume exceeded the configured anomaly threshold.",
        payload: {
          count: suspiciousBroadcasts?.length ?? 0,
        },
      })
      .select("id")
      .single();

    if (data?.id) {
      alertIds.push(data.id);
    }
  }

  return {
    alert_ids: alertIds,
    scanned_broadcast_count: suspiciousBroadcasts?.length ?? 0,
  };
}

async function runBadgeScanJob() {
  const supabase = createAdminClient();
  const { data: activeUsers } = await supabase
    .from("users")
    .select("id")
    .limit(100);

  return {
    scanned_user_count: activeUsers?.length ?? 0,
  };
}

async function runLeaderboardArchiveJob() {
  const supabase = createAdminClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);

  const { data, error } = await supabase
    .from("ranking_snapshots")
    .insert({
      period: "weekly",
      period_start: weekStart.toISOString().slice(0, 10),
      period_end: now.toISOString().slice(0, 10),
      board_type: "overall",
      category: null,
      rankings: [],
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to archive leaderboard snapshot: ${error.message}`);
  }

  return {
    snapshot_id: data?.id ?? null,
  };
}

async function runTxConfirmJob() {
  const supabase = createAdminClient();
  const { data: pendingPayments } = await supabase
    .from("payments")
    .select("id, tx_hash")
    .eq("status", "pending")
    .limit(Number(process.env.SETTLEMENT_CONFIRM_BATCH_SIZE ?? 20));

  const { data: pendingWithdrawals } = await supabase
    .from("withdrawals")
    .select("id, tx_hash")
    .eq("status", "processing")
    .limit(Number(process.env.SETTLEMENT_CONFIRM_BATCH_SIZE ?? 20));

  return {
    pending_payment_ids: (pendingPayments ?? []).map((payment) => payment.id),
    pending_withdrawal_ids: (pendingWithdrawals ?? []).map((withdrawal) => withdrawal.id),
  };
}

const CRON_JOB_HANDLERS: Record<CronJobName, CronJobHandler> = {
  "stale-task-cleanup": runStaleTaskCleanupJob,
  "health-recalc": runHealthRecalcJob,
  "timeout-check": runTimeoutCheckJob,
  "ranking-reset-weekly": runRankingResetWeeklyJob,
  "settlement-confirm": runSettlementConfirmJob,
  "stuck-withdrawal-check": runStuckWithdrawalCheckJob,
  "balance-audit": runBalanceAuditJob,
  "gas-monitor": runGasMonitorJob,
  "deletion-warning": runDeletionWarningJob,
  "supabase-keepalive": runSupabaseKeepaliveJob,
  "anomaly-scan": runAnomalyScanJob,
  "report-expiry": runReportExpiryJob,
  "badge-scan": runBadgeScanJob,
  "leaderboard-archive": runLeaderboardArchiveJob,
  "tx-confirm": runTxConfirmJob,
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
