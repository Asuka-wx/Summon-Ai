import { getAdminUserDetail } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";

type AdminUserRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: AdminUserRouteContext) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const result = await getAdminUserDetail(id);

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
