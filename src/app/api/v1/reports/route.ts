import { z } from "zod";

import { createReport } from "@/lib/reports/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

const reportSchema = z
  .object({
    direction: z.enum(["demand_to_agent", "supplier_to_demand"]),
    task_id: z.string().uuid(),
    agent_id: z.string().uuid().optional(),
    reported_user_id: z.string().uuid().optional(),
    message_id: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (value.direction === "demand_to_agent" && !value.agent_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agent_id"],
        message: "agent_id is required for demand_to_agent reports.",
      });
    }

    if (value.direction === "supplier_to_demand" && !value.reported_user_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reported_user_id"],
        message: "reported_user_id is required for supplier_to_demand reports.",
      });
    }
  });

export async function POST(request: Request) {
  try {
    const reporterId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: reporterId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const body = await parseJsonBody(request, reportSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Report payload is invalid.");
    }

    const report = await createReport({
      reporterId,
      direction: body.data.direction,
      taskId: body.data.task_id,
      agentId: body.data.agent_id,
      reportedUserId: body.data.reported_user_id,
      messageId: body.data.message_id,
      reason: body.data.reason,
      description: body.data.description,
    });

    return Response.json({ report }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
