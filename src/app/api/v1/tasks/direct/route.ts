import { z } from "zod";

import { createDirectTask } from "@/lib/matchmaking/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseJsonBody,
} from "@/lib/validation";

const directTaskSchema = z.object({
  agent_id: z.string().uuid(),
  prompt: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();
    const limited = await enforceRateLimit({
      key: currentUser.id,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = await parseJsonBody(request, directTaskSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Direct task payload is invalid.");
    }

    const result = await createDirectTask({
      userId: currentUser.id,
      agentId: body.data.agent_id,
      prompt: body.data.prompt,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
