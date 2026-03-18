import { createClient } from "@supabase/supabase-js";

let relaySupabaseAdminClient;

export function getRelaySupabaseAdminClient() {
  if (relaySupabaseAdminClient) {
    return relaySupabaseAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  relaySupabaseAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return relaySupabaseAdminClient;
}
