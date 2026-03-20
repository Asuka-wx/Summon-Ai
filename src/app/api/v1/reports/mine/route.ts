import { z } from "zod";

import { listOwnReports } from "@/lib/reports/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const ownReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const reporterId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: reporterId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const query = parseSearchParams(request, ownReportsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Reports query is invalid.");
    }

    const result = await listOwnReports({
      reporterId,
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
