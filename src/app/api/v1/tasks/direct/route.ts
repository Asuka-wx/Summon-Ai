import { createErrorResponse } from "@/lib/api-error";
import { createDirectTask } from "@/lib/matchmaking/service";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = (await request.json()) as {
      agent_id?: string;
      prompt?: string;
    };

    if (!body.agent_id || !body.prompt || body.prompt.trim().length === 0) {
      return createErrorResponse(400, "validation_error", "Direct task payload is invalid.", {
        agent_id: "Expected agent_id and prompt.",
      });
    }

    const result = await createDirectTask({
      userId: currentUser.id,
      agentId: body.agent_id,
      prompt: body.prompt.trim(),
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
