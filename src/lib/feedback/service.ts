import { createAdminClient } from "@/lib/supabase/admin";

export async function createFeedback({
  userId,
  type,
  description,
  screenshotUrl,
}: {
  userId?: string | null;
  type: "bug" | "feature" | "other";
  description: string;
  screenshotUrl?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: userId ?? null,
      type,
      description: description.trim(),
      screenshot_url: screenshotUrl?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return data;
}
