import { createAdminClient } from "@/lib/supabase/admin";

export async function recordCronHeartbeatSuccess(jobName: string, expectedInterval: string) {
  const supabase = createAdminClient();

  await supabase.from("cron_heartbeats").upsert({
    job_name: jobName,
    last_success_at: new Date().toISOString(),
    last_error: null,
    expected_interval: expectedInterval,
  });
}

export async function recordCronHeartbeatFailure(
  jobName: string,
  expectedInterval: string,
  errorMessage: string,
) {
  const supabase = createAdminClient();

  await supabase.from("cron_heartbeats").upsert({
    job_name: jobName,
    last_error: errorMessage,
    expected_interval: expectedInterval,
  });
}
