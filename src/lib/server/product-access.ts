import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureUserAccountRow } from "@/lib/users/profile";

export type ProductAccessState = {
  userId: string | null;
  email: string | null;
  role: string | null;
  isAdmin: boolean;
  isActivated: boolean;
  isSignedIn: boolean;
  invitationCodeEnabled: boolean;
  requiresActivation: boolean;
};

export async function getProductAccessState(): Promise<ProductAccessState> {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      userId: null,
      email: null,
      role: null,
      isAdmin: false,
      isActivated: false,
      isSignedIn: false,
      invitationCodeEnabled: true,
      requiresActivation: false,
    };
  }

  const supabase = createAdminClient();
  const [{ data: initialProfile }, { data: invitationConfig }] = await Promise.all([
    supabase
      .from("users")
      .select("role, is_activated")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("platform_config")
      .select("value")
      .eq("key", "invitation_code_enabled")
      .maybeSingle(),
  ]);

  let profile = initialProfile;

  if (!profile) {
    await ensureUserAccountRow(user.id);

    const { data: nextProfile } = await supabase
      .from("users")
      .select("role, is_activated")
      .eq("id", user.id)
      .maybeSingle();

    profile = nextProfile;
  }

  const metadataRole =
    (typeof user.app_metadata?.role === "string" && user.app_metadata.role) ||
    (typeof user.user_metadata?.role === "string" && user.user_metadata.role) ||
    null;
  const role = profile?.role ?? metadataRole;
  const isAdmin = role === "admin";
  const isActivated = profile?.is_activated ?? false;
  const invitationCodeEnabled =
    invitationConfig?.value !== "false" && invitationConfig?.value !== false;
  const requiresActivation = invitationCodeEnabled && !isAdmin && !isActivated;

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    isAdmin,
    isActivated,
    isSignedIn: true,
    invitationCodeEnabled,
    requiresActivation,
  };
}
