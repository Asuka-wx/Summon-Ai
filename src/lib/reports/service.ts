import { createAdminClient } from "@/lib/supabase/admin";

type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved_action"
  | "resolved_dismissed";

export async function createReport({
  reporterId,
  direction,
  taskId,
  agentId,
  reportedUserId,
  messageId,
  reason,
  description,
}: {
  reporterId: string;
  direction: "demand_to_agent" | "supplier_to_demand";
  taskId: string;
  agentId?: string;
  reportedUserId?: string;
  messageId?: string;
  reason: string;
  description?: string;
}) {
  const supabase = createAdminClient();
  const dailyLimit = Number(process.env.MAX_REPORTS_PER_USER_PER_DAY ?? 3);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .gte("created_at", since);

  if ((count ?? 0) >= dailyLimit) {
    throw new Error("max_reports_exceeded");
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  const payload =
    direction === "demand_to_agent"
      ? {
          reporter_id: reporterId,
          direction,
          agent_id: agentId ?? task.agent_id,
          reported_user_id: null,
          task_id: taskId,
          message_id: messageId ?? null,
          reason,
          description: description?.trim() || null,
          status: "pending",
        }
      : {
          reporter_id: reporterId,
          direction,
          agent_id: null,
          reported_user_id: reportedUserId ?? task.user_id,
          task_id: taskId,
          message_id: messageId ?? null,
          reason,
          description: description?.trim() || null,
          status: "pending",
        };

  const { data, error } = await supabase.from("reports").insert(payload).select("*").single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  await supabase.from("tasks").update({ has_report: true }).eq("id", taskId);

  return data;
}

export async function listOwnReports({
  reporterId,
  page,
  limit,
}: {
  reporterId: string;
  page: number;
  limit: number;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("reports")
    .select("*", { count: "exact" })
    .eq("reporter_id", reporterId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("validation_error");
  }

  return {
    reports: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function listAdminReports({
  page,
  limit,
  status,
}: {
  page: number;
  limit: number;
  status?: ReportStatus;
}) {
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from("reports")
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
    reports: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function updateAdminReport({
  reportId,
  adminId,
  status,
  adminNote,
}: {
  reportId: string;
  adminId: string;
  status: ReportStatus;
  adminNote?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      admin_note: adminNote?.trim() || null,
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("not_found");
  }

  await supabase.from("audit_logs").insert({
    event_type: "report_reviewed",
    user_id: adminId,
    task_id: data.task_id,
    amount: 0,
    metadata: {
      report_id: reportId,
      status,
    },
  });

  return data;
}
