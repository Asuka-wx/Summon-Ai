"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { clearOAuthPendingState } from "@/lib/auth/oauth-state";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect-target";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type SessionExitButtonProps = {
  locale: "en" | "zh";
  nextHref?: `/${string}`;
  mode?: "switch" | "signout";
  className?: string;
};

const COPY = {
  en: {
    switch: "Use another account",
    signout: "Sign out",
    working: "Signing out...",
    failed: "Unable to sign out right now. Please try again.",
  },
  zh: {
    switch: "切换账户",
    signout: "退出登录",
    working: "正在退出...",
    failed: "暂时无法退出登录，请稍后重试。",
  },
} as const;

function resolveNextHref(
  locale: "en" | "zh",
  nextHref: `/${string}` | undefined,
) {
  const fallback = `/${locale}/app` as const;

  if (nextHref) {
    return normalizeInternalRedirectTarget(nextHref, fallback);
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  const candidate = `${window.location.pathname}${window.location.search}`;
  return normalizeInternalRedirectTarget(candidate, fallback);
}

export function SessionExitButton({
  locale,
  nextHref,
  mode = "switch",
  className,
}: SessionExitButtonProps) {
  const copy = COPY[locale];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const target = resolveNextHref(locale, nextHref);

      await supabase.auth.signOut({ scope: "local" });
      clearOAuthPendingState();
      window.location.assign(`/${locale}/login?next=${encodeURIComponent(target)}`);
    } catch {
      setMessage(copy.failed);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={isSubmitting}
        onClick={() => void handleSignOut()}
        type="button"
        variant="ghost"
      >
        <LogOut className="h-4 w-4" />
        {isSubmitting ? copy.working : copy[mode]}
      </Button>
      {message ? <p className="text-sm text-[#FCA5A5]">{message}</p> : null}
    </div>
  );
}
