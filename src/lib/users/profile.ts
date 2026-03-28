import { getUserBalanceSummary } from "@/lib/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  bio: string | null;
  locale: string | null;
  role: string;
  is_frozen: boolean | null;
  twitter_handle: string | null;
  github_handle: string | null;
  payout_wallet: string | null;
  payout_chain: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeUserProfile(user: UserRow, balance: Awaited<ReturnType<typeof getUserBalanceSummary>>) {
  return {
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    email: user.email,
    bio: user.bio,
    locale: user.locale ?? "en",
    role: user.role,
    is_frozen: Boolean(user.is_frozen),
    twitter_handle: user.twitter_handle,
    github_handle: user.github_handle,
    payout_wallet: user.payout_wallet,
    payout_chain: user.payout_chain ?? "base",
    created_at: user.created_at,
    updated_at: user.updated_at,
    balance,
  };
}

async function buildFallbackUserProfile(
  userId: string,
  balance: Awaited<ReturnType<typeof getUserBalanceSummary>>,
) {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("unauthorized");
  }

  const rawDisplayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user.user_metadata?.preferred_username === "string" &&
      user.user_metadata.preferred_username) ||
    user.email?.split("@")[0] ||
    "SummonAI User";

  return {
    id: user.id,
    display_name: rawDisplayName,
    avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    email: user.email ?? null,
    bio: null,
    locale: "en",
    role: "member",
    is_frozen: false,
    twitter_handle: null,
    github_handle: null,
    payout_wallet: null,
    payout_chain: "base",
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    balance,
  };
}

export async function ensureUserAccountRow(userId: string) {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("unauthorized");
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const metadataRole =
    (typeof user.app_metadata?.role === "string" && user.app_metadata.role) ||
    (typeof user.user_metadata?.role === "string" && user.user_metadata.role) ||
    "member";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user.user_metadata?.preferred_username === "string" &&
      user.user_metadata.preferred_username) ||
    user.email?.split("@")[0] ||
    "SummonAI User";

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      bio: null,
      locale: "en",
      role: metadataRole,
      is_frozen: false,
      is_activated: metadataRole === "admin",
      payout_wallet: null,
      payout_chain: "base",
      updated_at: now,
      created_at: now,
    },
    {
      onConflict: "id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error("unauthorized");
  }
}

export async function getCurrentUserAccount(userId: string) {
  const supabase = createAdminClient();
  const [{ data: initialUser, error: initialError }, balance] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, display_name, avatar_url, email, bio, locale, role, is_frozen, twitter_handle, github_handle, payout_wallet, payout_chain, created_at, updated_at",
      )
      .eq("id", userId)
      .single(),
    getUserBalanceSummary(userId),
  ]);

  let user = initialUser;
  let error = initialError;

  if (error || !user) {
    await ensureUserAccountRow(userId);

    const result = await supabase
      .from("users")
      .select(
        "id, display_name, avatar_url, email, bio, locale, role, is_frozen, twitter_handle, github_handle, payout_wallet, payout_chain, created_at, updated_at",
      )
      .eq("id", userId)
      .maybeSingle();

    user = result.data;
    error = result.error;

    if (error || !user) {
      return buildFallbackUserProfile(userId, balance);
    }
  }

  return normalizeUserProfile(user as UserRow, balance);
}

export async function updateCurrentUserAccount({
  userId,
  payload,
}: {
  userId: string;
  payload: {
    display_name?: string;
    avatar_url?: string | null;
    bio?: string | null;
    locale?: "en" | "zh";
  };
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.display_name === "string") {
    updates.display_name = payload.display_name.trim();
  }

  if (payload.avatar_url !== undefined) {
    updates.avatar_url = payload.avatar_url?.trim() || null;
  }

  if (payload.bio !== undefined) {
    updates.bio = payload.bio?.trim() || null;
  }

  if (payload.locale) {
    updates.locale = payload.locale;
  }

  const { error } = await supabase.from("users").update(updates).eq("id", userId);

  if (error) {
    throw new Error("validation_error");
  }

  return getCurrentUserAccount(userId);
}
