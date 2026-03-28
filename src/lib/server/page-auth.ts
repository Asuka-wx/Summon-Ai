import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureUserAccountRow } from "@/lib/users/profile";

type PageAccessState = {
  userId: string | null;
  role: string | null;
  isActivated: boolean;
  invitationCodeEnabled: boolean;
};

async function readPageAccessState(): Promise<PageAccessState> {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  if (!userId) {
    return {
      userId: null,
      role: null,
      isActivated: false,
      invitationCodeEnabled: true,
    };
  }

  const supabase = createAdminClient();
  const [{ data: initialProfile }, { data: config }] = await Promise.all([
    supabase
      .from("users")
      .select("role, is_activated")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("platform_config")
      .select("value")
      .eq("key", "invitation_code_enabled")
      .maybeSingle(),
  ]);

  let profile = initialProfile;

  if (!profile) {
    await ensureUserAccountRow(userId);

    const { data: nextProfile } = await supabase
      .from("users")
      .select("role, is_activated")
      .eq("id", userId)
      .maybeSingle();

    profile = nextProfile;
  }

  const metadataRole =
    (typeof user?.app_metadata?.role === "string" && user.app_metadata.role) ||
    (typeof user?.user_metadata?.role === "string" && user.user_metadata.role) ||
    null;

  return {
    userId,
    role: profile?.role ?? metadataRole,
    isActivated: profile?.is_activated === true,
    invitationCodeEnabled: config?.value !== "false" && config?.value !== false,
  };
}

function createActivateRedirect(
  locale: string,
  redirectPath: string,
): `/${string}` {
  return `/${locale}/activate?redirect=${encodeURIComponent(redirectPath)}` as `/${string}`;
}

export async function getPageAccessState() {
  return readPageAccessState();
}

export async function requirePageUser(
  locale: string,
  redirectPath = `/${locale}/app`,
  options?: {
    allowInactive?: boolean;
  },
) {
  const access = await readPageAccessState();

  if (!access.userId) {
    redirect(`/${locale}/login?next=${encodeURIComponent(redirectPath)}`);
  }

  if (
    !options?.allowInactive &&
    access.invitationCodeEnabled &&
    access.role !== "admin" &&
    !access.isActivated
  ) {
    redirect(createActivateRedirect(locale, redirectPath) as never);
  }

  return access.userId;
}

export async function requirePageAdmin(
  locale: string,
  redirectPath = `/${locale}/admin`,
) {
  const access = await readPageAccessState();

  if (!access.userId) {
    redirect(`/${locale}/login?next=${encodeURIComponent(redirectPath)}`);
  }

  if (access.role !== "admin") {
    redirect(`/${locale}/app`);
  }

  return access.userId;
}
