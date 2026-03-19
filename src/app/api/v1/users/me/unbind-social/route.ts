import { createErrorResponse } from "@/lib/api-error";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { validateSocialUnbindEligibility } from "@/lib/security/social-binding";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = (await request.json()) as {
      provider?: "twitter" | "github";
    };

    if (!body.provider || !["twitter", "github"].includes(body.provider)) {
      return createErrorResponse(400, "validation_error", "Provider must be twitter or github.", {
        provider: "Expected twitter or github.",
      });
    }

    try {
      await validateSocialUnbindEligibility({
        userId,
        provider: body.provider,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "UNBIND_LIMIT_REACHED") {
        return Response.json(
          {
            code: "UNBIND_LIMIT_REACHED",
            message: "Social account unbind limit reached.",
          },
          { status: 403 },
        );
      }

      if (error instanceof Error && error.message === "UNBIND_COOLDOWN") {
        return Response.json(
          {
            code: "UNBIND_COOLDOWN",
            message: "Social account unbind cooldown is still active.",
          },
          { status: 400 },
        );
      }

      throw error;
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    if (body.provider === "twitter") {
      await supabase
        .from("users")
        .update({
          twitter_handle: null,
          twitter_verified_at: null,
          twitter_unbound_at: now,
        })
        .eq("id", userId);
    } else {
      await supabase
        .from("users")
        .update({
          github_handle: null,
          github_verified_at: null,
          github_unbound_at: now,
        })
        .eq("id", userId);
    }

    return Response.json({
      ok: true,
    });
  } catch {
    return createErrorResponse(401, "unauthorized", "Please sign in to continue.");
  }
}
