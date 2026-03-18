import { createErrorResponse } from "@/lib/api-error";
import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminTaskMessagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: AdminTaskMessagesRouteContext,
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return createErrorResponse(400, "validation_error", "Task id must be a valid UUID.", {
      id: "Expected UUID.",
    });
  }

  let adminSession;
  try {
    adminSession = await requireAdminSession();
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
    }

    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }

  const supabase = createAdminClient();

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, has_report")
    .eq("id", id)
    .single();

  if (taskError || !task) {
    return createErrorResponse(404, "task_not_found", "Task not found.");
  }

  const messages = await getDecryptedTaskMessages(id, supabase);

  await supabase.from("audit_logs").insert({
    event_type: "admin_view_messages",
    task_id: id,
    user_id: adminSession.userId,
    amount: 0,
    metadata: {
      has_report: task.has_report,
      action: "decrypt_messages",
    },
  });

  return Response.json({
    task_id: id,
    message_count: messages.length,
    messages,
  });
}
