import { requireAdminSession } from "@/lib/security/admin-access";
import { setUserFrozen } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";

type AdminUnfreezeUserRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: AdminUnfreezeUserRouteContext) {
  try {
    const admin = await requireAdminSession();
    const { id } = await params;
    const result = await setUserFrozen({
      userId: id,
      adminId: admin.userId,
      frozen: false,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
