import { z } from "zod";

import { getAdminDashboard } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const dashboardQuerySchema = z.object({
  period: z.enum(["today", "yesterday", "week", "month", "custom"]).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, dashboardQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Dashboard query is invalid.");
    }

    const result = await getAdminDashboard({
      period: query.data.period ?? "today",
      start: query.data.start,
      end: query.data.end,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
