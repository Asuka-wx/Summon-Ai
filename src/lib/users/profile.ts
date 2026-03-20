import { getUserBalanceSummary } from "@/lib/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function getCurrentUserAccount(userId: string) {
  const supabase = createAdminClient();
  const [{ data: user, error }, balance] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, display_name, avatar_url, email, bio, locale, role, is_frozen, twitter_handle, github_handle, payout_wallet, payout_chain, created_at, updated_at",
      )
      .eq("id", userId)
      .single(),
    getUserBalanceSummary(userId),
  ]);

  if (error || !user) {
    throw new Error("unauthorized");
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
