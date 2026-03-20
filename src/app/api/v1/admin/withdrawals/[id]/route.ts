import { z } from "zod";

import { updateAdminWithdrawal } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminWithdrawalRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const adminWithdrawalPatchSchema = z.object({
  status: z.enum(["processing", "completed", "failed", "stuck"]),
  tx_hash: z.string().trim().min(1).optional(),
});

export async function PATCH(request: Request, { params }: AdminWithdrawalRouteContext) {
  try {
    const admin = await requireAdminSession();
    const body = await parseJsonBody(request, adminWithdrawalPatchSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Withdrawal payload is invalid.");
    }

    const { id } = await params;
    const result = await updateAdminWithdrawal({
      withdrawalId: id,
      adminId: admin.userId,
      status: body.data.status,
      txHash: body.data.tx_hash,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
