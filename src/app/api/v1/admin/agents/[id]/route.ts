import { z } from "zod";

import { getAdminAgentDetail, updateAdminAgent } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminAgentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const adminAgentPatchSchema = z
  .object({
    status: z.enum(["online", "offline", "busy", "retiring", "archived"]).optional(),
    quality_status: z.enum(["normal", "warned", "demoted", "hidden", "recovery_pending"]).optional(),
  })
  .refine((value) => value.status !== undefined || value.quality_status !== undefined, {
    message: "status or quality_status is required.",
    path: ["root"],
  });

export async function GET(_request: Request, { params }: AdminAgentRouteContext) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const result = await getAdminAgentDetail(id);

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: AdminAgentRouteContext) {
  try {
    const admin = await requireAdminSession();
    const body = await parseJsonBody(request, adminAgentPatchSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Admin agent payload is invalid.");
    }

    const { id } = await params;
    const result = await updateAdminAgent({
      agentId: id,
      adminId: admin.userId,
      status: body.data.status,
      qualityStatus: body.data.quality_status,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
