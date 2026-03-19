import { createAdminClient } from "@/lib/supabase/admin";

export async function validateSocialUnbindEligibility({
  userId,
  provider,
}: {
  userId: string;
  provider: "twitter" | "github";
}) {
  const supabase = createAdminClient();
  let unbindCount = 0;
  let unboundAt: string | null = null;

  if (provider === "twitter") {
    const { data: user, error } = await supabase
      .from("users")
      .select("twitter_unbind_count, twitter_unbound_at")
      .eq("id", userId)
      .single();

    if (error || !user) {
      throw new Error("unauthorized");
    }

    unbindCount = Number(user.twitter_unbind_count ?? 0);
    unboundAt = user.twitter_unbound_at;
  } else {
    const { data: user, error } = await supabase
      .from("users")
      .select("github_unbind_count, github_unbound_at")
      .eq("id", userId)
      .single();

    if (error || !user) {
      throw new Error("unauthorized");
    }

    unbindCount = Number(user.github_unbind_count ?? 0);
    unboundAt = user.github_unbound_at;
  }
  const cooldownHours = Number(process.env.SOCIAL_UNBIND_COOLDOWN_HOURS ?? 48);
  const maxTimes = Number(process.env.SOCIAL_UNBIND_MAX_TIMES ?? 3);

  if (unbindCount >= maxTimes) {
    throw new Error("UNBIND_LIMIT_REACHED");
  }

  if (
    unboundAt &&
    Date.now() - new Date(unboundAt).getTime() < cooldownHours * 60 * 60 * 1000
  ) {
    throw new Error("UNBIND_COOLDOWN");
  }

  return true;
}

export async function verifyTwitterOwnership({
  tweetUrl,
  verificationCode,
}: {
  tweetUrl: string;
  verificationCode: string;
}) {
  const response = await fetch(
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}`,
  );

  const data = (await response.json()) as {
    html?: string;
  };

  return Boolean(data.html?.includes(verificationCode));
}

export async function verifyGithubOwnership({
  gistUrl,
  verificationCode,
}: {
  gistUrl: string;
  verificationCode: string;
}) {
  const response = await fetch(gistUrl);
  const text = await response.text();
  return text.includes(verificationCode);
}
