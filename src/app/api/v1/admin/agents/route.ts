import { z } from "zod";

import { listAdminAgents } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  quality_status: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminAgentsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Admin agents query is invalid.");
    }

    const result = await listAdminAgents({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      q: query.data.q,
      status: query.data.status,
      qualityStatus: query.data.quality_status,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
