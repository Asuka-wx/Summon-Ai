import { z } from "zod";

import { listAdminAuditLogs } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  event_type: z.string().trim().min(1).optional(),
  user_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminAuditLogsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Audit logs query is invalid.");
    }

    const result = await listAdminAuditLogs({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      eventType: query.data.event_type,
      userId: query.data.user_id,
      taskId: query.data.task_id,
      start: query.data.start,
      end: query.data.end,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
