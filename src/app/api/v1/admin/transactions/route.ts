import { z } from "zod";

import { listAdminTransactions } from "@/lib/admin/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseSearchParams } from "@/lib/validation";

const adminTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const query = parseSearchParams(request, adminTransactionsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Transactions query is invalid.");
    }

    const result = await listAdminTransactions({
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
      type: query.data.type,
      status: query.data.status,
      start: query.data.start,
      end: query.data.end,
    });

    return Response.json(result);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
