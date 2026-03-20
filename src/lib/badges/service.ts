import { createAdminClient } from "@/lib/supabase/admin";

export async function listUserBadges(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_badges")
    .select("earned_at, badges(id, code, name, description, icon, category)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) {
    throw new Error("validation_error");
  }

  return (data ?? []).flatMap((row) => {
    const badge = Array.isArray(row.badges) ? row.badges[0] : row.badges;

    if (!badge) {
      return [];
    }

    return [
      {
        earned_at: row.earned_at,
        badge,
      },
    ];
  });
}
