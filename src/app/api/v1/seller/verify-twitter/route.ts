import { createErrorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { verifyTwitterOwnership } from "@/lib/security/social-binding";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const body = (await request.json()) as {
      twitterHandle?: string;
      tweetUrl?: string;
      verificationCode?: string;
    };

    if (!body.twitterHandle || !body.tweetUrl || !body.verificationCode) {
      return createErrorResponse(400, "validation_error", "Twitter verification payload is invalid.", {
        twitterHandle: "Expected handle, tweet URL and verification code.",
      });
    }

    const verified = await verifyTwitterOwnership({
      tweetUrl: body.tweetUrl,
      verificationCode: body.verificationCode,
    });

    if (!verified) {
      return createErrorResponse(403, "validation_error", "Twitter ownership verification failed.");
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("twitter_handle", body.twitterHandle)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      return Response.json(
        {
          code: "TWITTER_ALREADY_BOUND",
          message: "This Twitter handle is already bound to another user.",
        },
        { status: 409 },
      );
    }

    await supabase
      .from("users")
      .update({
        twitter_handle: body.twitterHandle,
        twitter_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return Response.json({
      ok: true,
    });
  } catch {
    return createErrorResponse(401, "unauthorized", "Please sign in to continue.");
  }
}
