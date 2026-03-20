import { createErrorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { verifyGithubOwnership } from "@/lib/security/social-binding";
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
      githubHandle?: string;
      gistUrl?: string;
      verificationCode?: string;
    };

    if (!body.githubHandle || !body.gistUrl || !body.verificationCode) {
      return createErrorResponse(400, "validation_error", "GitHub verification payload is invalid.", {
        githubHandle: "Expected handle, gist URL and verification code.",
      });
    }

    const verified = await verifyGithubOwnership({
      gistUrl: body.gistUrl,
      verificationCode: body.verificationCode,
    });

    if (!verified) {
      return createErrorResponse(403, "validation_error", "GitHub ownership verification failed.");
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("github_handle", body.githubHandle)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      return Response.json(
        {
          code: "GITHUB_ALREADY_BOUND",
          message: "This GitHub handle is already bound to another user.",
        },
        { status: 409 },
      );
    }

    await supabase
      .from("users")
      .update({
        github_handle: body.githubHandle,
        github_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return Response.json({
      ok: true,
    });
  } catch {
    return createErrorResponse(401, "unauthorized", "Please sign in to continue.");
  }
}
