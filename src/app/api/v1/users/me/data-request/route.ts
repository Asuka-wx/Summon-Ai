import { z } from "zod";

import { createDataRequest } from "@/lib/privacy/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

const dataRequestSchema = z.object({
  type: z.string().trim().min(1).max(50).default("access_export"),
});

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const body = await parseJsonBody(request, dataRequestSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Data request payload is invalid.");
    }

    const dataRequest = await createDataRequest({
      userId,
      type: body.data.type,
    });

    return Response.json({ request: dataRequest }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
