"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { clearOAuthPendingState, readOAuthPendingState } from "@/lib/auth/oauth-state";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect-target";
import { createClient } from "@/lib/supabase/client";

function inferLocaleFromPathname(pathname: string): "en" | "zh" {
  return pathname.startsWith("/zh") ? "zh" : "en";
}

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      restoring: "正在恢复你的登录状态...",
      returning: "正在带你回到刚才离开的页面...",
      redirecting: "登录已恢复，正在进入产品...",
      eyebrow: "OAuth 回调",
      title: "正在完成登录",
      backHome: "返回主页",
    };
  }

  return {
    restoring: "Restoring your session...",
    returning: "Returning you to where you left off...",
    redirecting: "Session restored. Redirecting into the app...",
    eyebrow: "OAuth Callback",
    title: "Completing sign in",
    backHome: "Back to home",
  };
}

export function OAuthCallback() {
  const [message, setMessage] = useState("Restoring your session...");
  const [locale, setLocale] = useState<"en" | "zh">("en");

  useEffect(() => {
    let mounted = true;

    async function restore() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const currentLocale = inferLocaleFromPathname(url.pathname);
      const copy = getCopy(currentLocale);
      const code = url.searchParams.get("code");
      const fallbackPath = `/${currentLocale}/app` as const;

      if (mounted) {
        setLocale(currentLocale);
        setMessage(copy.restoring);
      }

      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      }

      const pendingState = readOAuthPendingState();

      if (pendingState && Date.now() - Number(pendingState.timestamp ?? 0) <= 10 * 60 * 1000) {
        if (mounted) {
          setMessage(copy.returning);
        }
        clearOAuthPendingState();
        window.location.replace(
          normalizeInternalRedirectTarget(pendingState.returnUrl, fallbackPath),
        );
        return;
      }

      clearOAuthPendingState();
      if (mounted) {
        setMessage(copy.redirecting);
      }
      window.location.replace(fallbackPath);
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  const copy = getCopy(locale);

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#09090B] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,0.14),transparent_24%)]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-6%] h-72 w-72 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute top-[22%] right-[-8%] h-64 w-64 rounded-full bg-[rgba(139,92,246,0.06)] blur-3xl" />

      <header className="relative z-10 border-b border-white/8 bg-[rgba(9,9,11,0.72)] backdrop-blur-[18px]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
          <a href={`/${locale}`} className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-white" />
            <span className="text-[15px] font-medium text-white">SummonAI</span>
          </a>

          <a
            href={`/${locale}`}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/72 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            {copy.backHome}
          </a>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-77px)] w-full max-w-[1280px] flex-1 items-center justify-center px-6 py-8 lg:px-8">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(24,24,27,0.94))] p-8 text-center shadow-[0_36px_140px_-60px_rgba(139,92,246,0.45)]">
          <p className="text-xs font-semibold tracking-[0.22em] text-white/62 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
            {copy.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/60">{message}</p>
        </div>
      </div>
    </main>
  );
}
