import { z } from "zod";

import { updateAdminAlert } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminAlertRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const adminAlertPatchSchema = z.object({
  status: z.string().trim().min(1),
  admin_note: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: AdminAlertRouteContext) {
  try {
    const admin = await requireAdminSession();
    const body = await parseJsonBody(request, adminAlertPatchSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Alert payload is invalid.");
    }

    const { id } = await params;
    const result = await updateAdminAlert({
      alertId: id,
      adminId: admin.userId,
      status: body.data.status,
      adminNote: body.data.admin_note,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
