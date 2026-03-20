import { z } from "zod";

import { createFeedback } from "@/lib/feedback/service";
import { enforceRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { getCurrentUserId } from "@/lib/server/current-user";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  description: z.string().trim().min(1).max(500),
  screenshot_url: z.string().trim().url().max(2000).optional(),
});

export async function POST(request: Request) {
  const body = await parseJsonBody(request, feedbackSchema);

  if (!body.success) {
    return createValidationErrorResponse(body.error, "Feedback payload is invalid.");
  }

  const limited = await enforceRateLimit({
    key: getRequestIp(request),
    prefix: "feedback",
    maxRequests: 5,
    interval: "1 h",
    message: "Too many feedback submissions. Please try again later.",
  });

  if (limited) {
    return limited;
  }

  const userId = await getCurrentUserId();
  const feedback = await createFeedback({
    userId,
    type: body.data.type,
    description: body.data.description,
    screenshotUrl: body.data.screenshot_url,
  });

  return Response.json({ feedback }, { status: 201 });
}
