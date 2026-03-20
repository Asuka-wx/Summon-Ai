import { z } from "zod";

import { exportAdminData } from "@/lib/admin/export";
import { createErrorResponse } from "@/lib/api-error";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";

type AdminExportRouteContext = {
  params: Promise<{
    type: string;
  }>;
};

const exportTypeSchema = z.enum(["users", "agents", "tasks", "transactions", "audit_logs"]);

export async function GET(request: Request, { params }: AdminExportRouteContext) {
  try {
    const admin = await requireAdminSession();
    const { type } = await params;
    const parsedType = exportTypeSchema.safeParse(type);

    if (!parsedType.success) {
      return createErrorResponse(400, "validation_error", "Export type is invalid.", {
        type: "Expected one of users, agents, tasks, transactions, audit_logs.",
      });
    }

    const limited = await enforceRateLimit({
      key: admin.userId,
      prefix: "admin-export",
      maxRequests: 5,
      interval: "1 h",
      message: "Too many export requests.",
    });

    if (limited) {
      return limited;
    }

    const csv = await exportAdminData(parsedType.data);

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${parsedType.data}.csv"`,
      },
    });
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
