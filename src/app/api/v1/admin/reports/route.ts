import { z } from "zod";

import { listAdminReports } from "@/lib/reports/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["pending", "reviewing", "resolved_action", "resolved_dismissed"]).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminReportsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Admin reports query is invalid.");
    }

    const result = await listAdminReports({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      status: query.data.status,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
