import { z } from "zod";

import { updateAdminConfigEntry } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminConfigRouteContext = {
  params: Promise<{
    key: string;
  }>;
};

const adminConfigPatchSchema = z.object({
  value: z.unknown(),
  description: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: AdminConfigRouteContext) {
  try {
    const admin = await requireAdminSession();
    const body = await parseJsonBody(request, adminConfigPatchSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Config payload is invalid.");
    }

    const { key } = await params;
    const result = await updateAdminConfigEntry({
      key,
      value: body.data.value,
      description: body.data.description,
      adminId: admin.userId,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
