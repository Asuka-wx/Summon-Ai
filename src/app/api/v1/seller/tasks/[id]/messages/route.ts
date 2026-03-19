import { createErrorResponse } from "@/lib/api-error";
import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

type SellerTaskMessagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: SellerTaskMessagesRouteContext,
) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .select("id, is_test, agent_id, agents(owner_id)")
      .eq("id", id)
      .single();

    if (error || !task) {
      return createErrorResponse(404, "task_not_found", "Task not found.");
    }

    const ownerId = (task as { agents?: { owner_id?: string } }).agents?.owner_id;
    if (!task.is_test || ownerId !== currentUser.id) {
      return createErrorResponse(403, "not_agent_owner", "You do not have permission to view this task.");
    }

    const messages = await getDecryptedTaskMessages(id, supabase);

    return Response.json({
      task_id: id,
      messages,
    });
  } catch {
    return createErrorResponse(401, "unauthorized", "Please sign in to continue.");
  }
}
