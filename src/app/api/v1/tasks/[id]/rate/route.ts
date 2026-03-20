import { z } from "zod";

import { requireCurrentUserId } from "@/lib/server/current-user";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { submitTaskRating } from "@/lib/ratings/service";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseJsonBody,
} from "@/lib/validation";

type TaskRateRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const rateTaskSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  tip_amount: z.number().min(0).max(50).optional(),
});

export async function POST(request: Request, { params }: TaskRateRouteContext) {
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

    const body = await parseJsonBody(request, rateTaskSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Task rating payload is invalid.");
    }

    const { id } = await params;
    const result = await submitTaskRating({
      taskId: id,
      userId,
      rating: body.data.rating,
      comment: body.data.comment,
      tipAmount: body.data.tip_amount,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
