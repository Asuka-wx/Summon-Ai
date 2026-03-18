import cron from "node-cron";

import { relayConfig } from "./config.mjs";
import { getRelayRedisClient } from "./redis.mjs";
import { getRelaySupabaseAdminClient } from "./supabase.mjs";

function buildVercelCronUrl(path) {
  const base = relayConfig.vercelApiUrl.endsWith("/")
    ? relayConfig.vercelApiUrl
    : `${relayConfig.vercelApiUrl}/`;

  return new URL(path, base).toString();
}

async function triggerCronRoute(path) {
  const url = buildVercelCronUrl(path);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${relayConfig.cronSecret}`,
    },
  });

  return {
    ok: response.ok,
    status: response.status,
  };
}

export async function flushOnlineStats(relayState) {
  const supabase = getRelaySupabaseAdminClient();
  const entries = relayState.flushOnlineAccumulatorEntries();

  if (!supabase || entries.length === 0) {
    return {
      flushed: 0,
    };
  }

  for (const [agentId, seconds] of entries) {
    await supabase.rpc("upsert_online_seconds", {
      p_agent_id: agentId,
      p_stat_date: new Date().toISOString().slice(0, 10),
      p_seconds: seconds,
    });
  }

  return {
    flushed: entries.length,
  };
}

export function startCronScheduler(relayState) {
  getRelayRedisClient();

  const scheduledJobs = [
    cron.schedule("*/10 * * * *", () => void triggerCronRoute("cron/stale-task-cleanup")),
    cron.schedule("0 */6 * * *", () => void triggerCronRoute("cron/health-recalc")),
    cron.schedule("0 0 * * 1", () => void triggerCronRoute("cron/ranking-reset-weekly")),
    cron.schedule("*/5 * * * *", () => void triggerCronRoute("cron/settlement-confirm")),
    cron.schedule("*/10 * * * *", () => void triggerCronRoute("cron/stuck-withdrawal-check")),
    cron.schedule("0 * * * *", () => void triggerCronRoute("cron/deletion-warning")),
    cron.schedule("0 4 * * *", () => void triggerCronRoute("cron/report-expiry")),
    cron.schedule("0 * * * *", () => void triggerCronRoute("cron/conversation-cleanup")),
    cron.schedule("*/5 * * * *", () => void flushOnlineStats(relayState)),
  ];

  return () => {
    scheduledJobs.forEach((job) => job.stop());
  };
}
