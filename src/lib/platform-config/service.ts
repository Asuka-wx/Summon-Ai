import { createAdminClient } from "@/lib/supabase/admin";

export async function getPlatformConfigValue<T = unknown>(key: string, fallback: T): Promise<T> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  return (data?.value as T | undefined) ?? fallback;
}

export async function setPlatformConfigValue(key: string, value: unknown, description?: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("platform_config").upsert(
    {
      key,
      value,
      description,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "key",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}
