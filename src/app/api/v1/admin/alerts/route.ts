import { z } from "zod";

import { listAdminAlerts } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminAlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().trim().min(1).optional(),
  alert_type: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminAlertsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Alerts query is invalid.");
    }

    const result = await listAdminAlerts({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      status: query.data.status,
      alertType: query.data.alert_type,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
