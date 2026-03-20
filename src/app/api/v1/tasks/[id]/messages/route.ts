import { z } from "zod";

import { sendTaskMessage } from "@/lib/matchmaking/service";
import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createValidationErrorResponse,
  parseJsonBody,
  parseSearchParams,
} from "@/lib/validation";

type TaskMessagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TaskMessagesRouteContext) {
  try {
    const query = parseSearchParams(
      _request,
      z.object({
        after_round: z.coerce.number().int().min(0).optional(),
      }),
    );

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Task message query is invalid.");
    }

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

    const messages = await getDecryptedTaskMessages(id, supabase, {
      afterRound: query.data.after_round,
    });

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
    const limited = await enforceRateLimit({
      key: currentUser.id,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = await parseJsonBody(
      request,
      z.object({
        content: z.string().trim().min(1).max(5000),
      }),
    );

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Task message payload is invalid.");
    }

    const { id } = await params;
    const result = await sendTaskMessage({
      taskId: id,
      userId: currentUser.id,
      content: body.data.content,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
