import { createErrorResponse } from "@/lib/api-error";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { validateSocialUnbindEligibility } from "@/lib/security/social-binding";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = (await request.json()) as {
      platform?: "twitter" | "github";
      provider?: "twitter" | "github";
    };
    const provider = body.platform ?? body.provider;

    if (!provider || !["twitter", "github"].includes(provider)) {
      return createErrorResponse(400, "validation_error", "Provider must be twitter or github.", {
        platform: "Expected twitter or github.",
      });
    }

    try {
      await validateSocialUnbindEligibility({
        userId,
        provider,
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
    const { data: user } = await supabase
      .from("users")
      .select("twitter_unbind_count, github_unbind_count")
      .eq("id", userId)
      .maybeSingle();

    if (provider === "twitter") {
      await supabase
        .from("users")
        .update({
          twitter_handle: null,
          twitter_verified_at: null,
          twitter_unbound_at: now,
          twitter_unbind_count: Number(user?.twitter_unbind_count ?? 0) + 1,
        })
        .eq("id", userId);
    } else {
      await supabase
        .from("users")
        .update({
          github_handle: null,
          github_verified_at: null,
          github_unbound_at: now,
          github_unbind_count: Number(user?.github_unbind_count ?? 0) + 1,
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
