import { z } from "zod";

import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { listUserTasks } from "@/lib/tasks/queries";
import {
  createValidationErrorResponse,
  parseSearchParams,
} from "@/lib/validation";

const tasksQuerySchema = z.object({
  status: z.enum(["confirming", "active", "paused", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const query = parseSearchParams(request, tasksQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Task query is invalid.");
    }

    const userId = await requireCurrentUserId();
    const result = await listUserTasks({
      userId,
      status: query.data.status,
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
