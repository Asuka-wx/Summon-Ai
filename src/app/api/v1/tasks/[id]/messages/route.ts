import { createErrorResponse } from "@/lib/api-error";
import { sendTaskMessage } from "@/lib/matchmaking/service";
import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

type TaskMessagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TaskMessagesRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: task, error } = await supabase
      .from("tasks")
      .select("id, user_id, status, phase")
      .eq("id", id)
      .single();

    if (error || !task) {
      throw new Error("task_not_found");
    }

    if (task.user_id !== currentUser.id) {
      throw new Error("not_task_owner");
    }

    const messages = await getDecryptedTaskMessages(id, supabase);

    return Response.json({
      task_id: id,
      status: task.status,
      phase: task.phase,
      messages,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: TaskMessagesRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const { id } = await params;
    const body = (await request.json()) as {
      content?: string;
    };

    if (!body.content || body.content.trim().length === 0) {
      return createErrorResponse(400, "validation_error", "Message content is required.", {
        content: "Expected non-empty content.",
      });
    }

    const result = await sendTaskMessage({
      taskId: id,
      userId: currentUser.id,
      content: body.content.trim(),
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
