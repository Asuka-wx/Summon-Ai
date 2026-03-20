import { z } from "zod";

import { updateAdminReport } from "@/lib/reports/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminReportRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const adminReportPatchSchema = z.object({
  status: z.enum(["pending", "reviewing", "resolved_action", "resolved_dismissed"]),
  admin_note: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: AdminReportRouteContext) {
  try {
    const admin = await requireAdminSession();
    const body = await parseJsonBody(request, adminReportPatchSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Admin report payload is invalid.");
    }

    const { id } = await params;
    const result = await updateAdminReport({
      reportId: id,
      adminId: admin.userId,
      status: body.data.status,
      adminNote: body.data.admin_note,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
