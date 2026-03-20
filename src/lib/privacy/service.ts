import { createAdminClient } from "@/lib/supabase/admin";

export async function createDataRequest({
  userId,
  type,
}: {
  userId: string;
  type: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("data_deletion_requests")
    .insert({
      user_id: userId,
      type,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return data;
}
