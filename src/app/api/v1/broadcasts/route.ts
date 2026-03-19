import { createErrorResponse } from "@/lib/api-error";
import { createBroadcast } from "@/lib/matchmaking/service";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = (await request.json()) as {
      prompt?: string;
      categories?: string[];
    };

    if (!body.prompt || body.prompt.trim().length === 0) {
      return createErrorResponse(400, "validation_error", "Prompt is required.", {
        prompt: "Expected non-empty prompt.",
      });
    }

    const broadcast = await createBroadcast({
      userId: currentUser.id,
      prompt: body.prompt.trim(),
      categories: body.categories ?? [],
    });

    return Response.json({
      broadcastId: broadcast.id,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
