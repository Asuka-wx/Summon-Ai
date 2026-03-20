import { listAdminConfigEntries } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";

export async function GET() {
  try {
    await requireAdminSession();
    const entries = await listAdminConfigEntries();

    return Response.json({
      config: entries,
    });
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
