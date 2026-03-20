import { createErrorResponse } from "@/lib/api-error";
import { executeCronJob, isCronJobName } from "@/lib/cron/jobs";

const CRON_JOB_ALIASES = {
  "task-timeout-check": "timeout-check",
  "gas-balance-check": "gas-monitor",
  "ranking-reset-monthly": "leaderboard-archive",
} as const;

type CronRouteContext = {
  params: Promise<{
    job: string;
  }>;
};

export async function POST(request: Request, { params }: CronRouteContext) {
  const { job: rawJob } = await params;
  const job = CRON_JOB_ALIASES[rawJob as keyof typeof CRON_JOB_ALIASES] ?? rawJob;

  if (!isCronJobName(job)) {
    return createErrorResponse(404, "not_found", "Cron job route not found.");
  }

  return executeCronJob(job, request);
}
