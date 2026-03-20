import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCaptcha } from "@/lib/security/captcha";

export async function shouldRequireBroadcastCaptcha(userId: string) {
  const supabase = createAdminClient();
  const windowMinutes = Number(process.env.CAPTCHA_WINDOW_MINUTES ?? 5);
  const threshold = Number(process.env.CAPTCHA_BROADCAST_THRESHOLD ?? 3);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("broadcasts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  return (count ?? 0) >= threshold;
}

export async function enforceBroadcastCaptcha({
  userId,
  captchaToken,
}: {
  userId: string;
  captchaToken?: string;
}) {
  const required = await shouldRequireBroadcastCaptcha(userId);

  if (!required) {
    return;
  }

  if (!captchaToken) {
    throw new Error("captcha_required");
  }

  try {
    await verifyCaptcha(captchaToken);
  } catch {
    throw new Error("captcha_required");
  }
}
