import { z } from "zod";

import { listAdminUsers } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  is_frozen: z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminUsersQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Admin users query is invalid.");
    }

    const result = await listAdminUsers({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      q: query.data.q,
      role: query.data.role,
      isFrozen:
        query.data.is_frozen === undefined ? undefined : query.data.is_frozen === "true",
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
