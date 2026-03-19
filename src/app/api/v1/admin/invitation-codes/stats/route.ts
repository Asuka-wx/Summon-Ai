import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = createAdminClient();

    const [{ count: totalCodes }, { count: totalUsed }, { count: totalActivatedUsers }, { data: batchRows }] =
      await Promise.all([
        supabase.from("invitation_codes").select("id", { count: "exact", head: true }),
        supabase.from("invitation_code_usages").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("is_activated", true),
        supabase.from("invitation_codes").select("batch_name, max_uses, use_count"),
      ]);

    const byBatch = Object.values(
      (batchRows ?? []).reduce((accumulator, row) => {
        const batchName = row.batch_name ?? "default";
        const current = accumulator[batchName] ?? {
          batch_name: batchName,
          total: 0,
          used: 0,
          remaining: 0,
        };

        current.total += 1;
        current.used += Number(row.use_count ?? 0);
        current.remaining += Math.max(Number(row.max_uses ?? 1) - Number(row.use_count ?? 0), 0);
        accumulator[batchName] = current;
        return accumulator;
      }, {} as Record<string, { batch_name: string; total: number; used: number; remaining: number }>),
    );

    return Response.json({
      total_codes: totalCodes ?? 0,
      total_used: totalUsed ?? 0,
      total_activated_users: totalActivatedUsers ?? 0,
      by_batch: byBatch,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
