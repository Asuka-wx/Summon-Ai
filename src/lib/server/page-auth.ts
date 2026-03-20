import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/server/current-user";

export async function requirePageUser(locale: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect(`/${locale}`);
  }

  return userId;
}

export async function requirePageAdmin(locale: string) {
  const userId = await requirePageUser(locale);
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(`/${locale}`);
  }

  return userId;
}
