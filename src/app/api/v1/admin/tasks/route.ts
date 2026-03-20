import { z } from "zod";

import { listAdminTasks } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().trim().min(1).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminTasksQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Admin tasks query is invalid.");
    }

    const result = await listAdminTasks({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      status: query.data.status,
      start: query.data.start,
      end: query.data.end,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
