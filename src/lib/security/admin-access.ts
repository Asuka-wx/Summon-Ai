import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

type AdminSession = {
  userId: string;
  role: string;
  totpEnabledAt: string | null;
};

export async function requireAdminSession(
  supabase: SupabaseClient = createAdminClient(),
): Promise<AdminSession> {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, role, totp_enabled_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error("admin_required");
  }

  if (data.role !== "admin") {
    throw new Error("admin_required");
  }

  if (
    (process.env.ADMIN_2FA_REQUIRED ?? "true") === "true" &&
    !data.totp_enabled_at
  ) {
    throw new Error("mfa_required");
  }

  return {
    userId: data.id,
    role: data.role,
    totpEnabledAt: data.totp_enabled_at,
  };
}
