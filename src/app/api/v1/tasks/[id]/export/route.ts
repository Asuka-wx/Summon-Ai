import { exportTaskConversation } from "@/lib/export/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { createErrorResponse } from "@/lib/api-error";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskExportRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TaskExportRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const markdown = await exportTaskConversation({
      taskId: id,
      userId,
    });

    return new Response(markdown, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "conversation_expired") {
      return createErrorResponse(410, "conversation_expired", "Conversation has expired and been deleted.");
    }

    return toErrorResponse(error);
  }
}
