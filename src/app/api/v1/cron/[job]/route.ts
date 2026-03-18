import { createErrorResponse } from "@/lib/api-error";
import { executeCronJob, isCronJobName } from "@/lib/cron/jobs";

type CronRouteContext = {
  params: Promise<{
    job: string;
  }>;
};

export async function POST(request: Request, { params }: CronRouteContext) {
  const { job } = await params;

  if (!isCronJobName(job)) {
    return createErrorResponse(404, "not_found", "Cron job route not found.");
  }

  return executeCronJob(job, request);
}
