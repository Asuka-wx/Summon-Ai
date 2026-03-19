import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createApiRatelimit } from "@/lib/upstash/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch");
    const active = searchParams.get("active");
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const supabase = createAdminClient();

    let query = supabase
      .from("invitation_codes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (batch) {
      query = query.eq("batch_name", batch);
    }

    if (active === "true") {
      query = query.eq("is_active", true);
    }

    if (active === "false") {
      query = query.eq("is_active", false);
    }

    const { data, count, error } = await query;

    if (error) {
      return createErrorResponse(500, "validation_error", error.message);
    }

    return Response.json({
      codes: data ?? [],
      total: count ?? 0,
      page,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const limiter = createApiRatelimit("admin-invitation-codes", 10, "1 m");

    if (limiter) {
      const result = await limiter.limit(admin.userId);
      if (!result.success) {
        return createErrorResponse(429, "rate_limit_exceeded", "Too many invitation code generation requests.");
      }
    }

    const body = (await request.json()) as {
      count?: number;
      batch_name?: string;
      max_uses?: number;
      expires_at?: string;
      note?: string;
    };

    if (typeof body.count !== "number") {
      return createErrorResponse(400, "validation_error", "Count is required.", {
        count: "Expected numeric count.",
      });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("generate_invitation_codes", {
      p_admin_id: admin.userId,
      p_count: body.count,
      p_batch_name: body.batch_name ?? null,
      p_max_uses: body.max_uses ?? 1,
      p_expires_at: body.expires_at ?? null,
      p_note: body.note ?? null,
    });

    if (error) {
      return createErrorResponse(500, "validation_error", error.message);
    }

    return Response.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
