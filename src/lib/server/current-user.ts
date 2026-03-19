import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCurrentUserId() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("unauthorized");
  }

  return userId;
}

export async function getCurrentUserProfile() {
  const userId = await requireCurrentUserId();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, role, is_frozen")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("unauthorized");
  }

  return data;
}
