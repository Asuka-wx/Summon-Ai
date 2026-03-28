"use client";

import { Github, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { persistOAuthPendingState } from "@/lib/auth/oauth-state";
import { createClient } from "@/lib/supabase/client";

type LoginPanelProps = {
  locale: "en" | "zh";
  nextHref: string;
};

type LoginCopy = {
  eyebrow: string;
  title: string;
  description: string;
  google: string;
  github: string;
  loadingGoogle: string;
  loadingGithub: string;
  inviteNote: string;
  inviteCta: string;
  bottomHint: string;
  googleFailed: string;
  githubFailed: string;
};

function getCopy(locale: "en" | "zh"): LoginCopy {
  if (locale === "zh") {
    return {
      eyebrow: "封闭邀请制",
      title: "登录后继续",
      description: "如果你的访问资格已经开通，登录后系统会自动带你进入正确的下一步。",
      google: "使用 Google 继续",
      github: "使用 GitHub 继续",
      loadingGoogle: "正在跳转到 Google...",
      loadingGithub: "正在跳转到 GitHub...",
      inviteNote: "还没有邀请码？",
      inviteCta: "去申请",
      bottomHint: "登录完成后，我们会把你带回刚才准备进入的位置。",
      googleFailed: "Google 登录暂时不可用，请稍后重试。",
      githubFailed: "GitHub 登录暂时不可用，请稍后重试。",
    };
  }

  return {
    eyebrow: "Invite-only beta",
    title: "Sign in to continue",
    description:
      "If your access has already been invited, signing in will take you to the right next step automatically.",
    google: "Continue with Google",
    github: "Continue with GitHub",
    loadingGoogle: "Redirecting to Google...",
    loadingGithub: "Redirecting to GitHub...",
    inviteNote: "Need an invite first?",
    inviteCta: "Apply now",
    bottomHint: "After sign-in, you will be returned to the destination you were trying to reach.",
    googleFailed: "Google sign-in is unavailable right now. Please try again.",
    githubFailed: "GitHub sign-in is unavailable right now. Please try again.",
  };
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.72-.06-1.25-.19-1.8H12v3.48h5.53c-.11.87-.71 2.19-2.04 3.07l-.02.12 2.84 2.2.2.02c1.84-1.7 3.09-4.19 3.09-7.09Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.15-2.44c-.84.59-1.97 1-3.46 1-2.64 0-4.88-1.74-5.67-4.15l-.11.01-2.95 2.29-.04.1C4.87 19.86 8.14 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.33 13.99A5.95 5.95 0 0 1 6 12c0-.69.12-1.36.31-1.99l-.01-.13-2.99-2.33-.1.05A9.99 9.99 0 0 0 2 12c0 1.62.39 3.15 1.21 4.4l3.12-2.41Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.86c1.87 0 3.13.81 3.85 1.49l2.81-2.74C16.95 3.02 14.7 2 12 2 8.14 2 4.87 4.14 3.2 7.6l3.1 2.41C7.12 7.6 9.36 5.86 12 5.86Z"
      />
    </svg>
  );
}

export function LoginPanel({ locale, nextHref }: LoginPanelProps) {
  const copy = getCopy(locale);
  const [message, setMessage] = useState<string | null>(null);
  const [submittingProvider, setSubmittingProvider] = useState<"github" | "google" | null>(null);
  const normalizedNextHref = useMemo(
    () => (nextHref.startsWith("/") ? nextHref : `/${locale}/app`),
    [locale, nextHref],
  );

  async function handleOAuthSignIn(provider: "github" | "google") {
    setSubmittingProvider(provider);
    setMessage(null);

    try {
      const supabase = createClient();

      persistOAuthPendingState({
        returnUrl: normalizedNextHref,
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
      });

      if (error) {
        setMessage(provider === "google" ? copy.googleFailed : copy.githubFailed);
        setSubmittingProvider(null);
      }
    } catch {
      setMessage(provider === "google" ? copy.googleFailed : copy.githubFailed);
      setSubmittingProvider(null);
    }
  }

  return (
    <section className="grid w-full gap-8 overflow-hidden rounded-[2.5rem] border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(24,24,27,0.94))] p-8 text-white shadow-[0_36px_140px_-60px_rgba(139,92,246,0.55)] lg:grid-cols-[minmax(0,0.95fr)_420px]">
      <div className="max-w-lg self-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-white/62 uppercase">
          <Lock className="h-3.5 w-3.5" />
          {copy.eyebrow}
        </div>
        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-5 max-w-md text-base leading-8 text-white/72">
          {copy.description}
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 backdrop-blur">
        <p className="text-xs font-semibold tracking-[0.22em] text-white/56 uppercase">
          Sign In
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Button
            className="h-12 justify-start rounded-2xl border border-white/10 bg-white px-4 font-medium text-[#18181B] shadow-[0_18px_38px_-24px_rgba(255,255,255,0.55)] transition-all duration-200 hover:bg-white/96"
            disabled={submittingProvider !== null}
            onClick={() => void handleOAuthSignIn("google")}
            type="button"
          >
            <GoogleIcon />
            <span className="ml-2">
              {submittingProvider === "google" ? copy.loadingGoogle : copy.google}
            </span>
          </Button>
          <Button
            className="h-12 justify-start rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 font-medium text-white transition-all duration-200 hover:bg-[rgba(255,255,255,0.1)]"
            disabled={submittingProvider !== null}
            onClick={() => void handleOAuthSignIn("github")}
            type="button"
          >
            <Github className="h-4 w-4" />
            <span className="ml-2">
              {submittingProvider === "github" ? copy.loadingGithub : copy.github}
            </span>
          </Button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-black/14 px-4 py-3">
          <p className="text-sm leading-7 text-white/62">
            {copy.inviteNote}{" "}
            <Link
              href="/early-access?source=login-page"
              locale={locale}
              className="font-medium text-[#DDD6FE] hover:text-white"
            >
              {copy.inviteCta}
            </Link>
          </p>
        </div>

        <p className="mt-4 text-sm leading-7 text-white/50">{copy.bottomHint}</p>
        {message ? <p className="mt-4 text-sm text-[#FCA5A5]">{message}</p> : null}
      </div>
    </section>
  );
}
