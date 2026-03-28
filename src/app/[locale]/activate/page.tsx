import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ActivateForm } from "@/components/activation/activate-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SessionExitButton } from "@/components/auth/session-exit-button";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect-target";
import { getProductAccessState } from "@/lib/server/product-access";

type ActivatePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    redirect?: string | string[];
  }>;
};

const COPY = {
  en: {
    eyebrow: "Closed beta access",
    title: "Activate this account with your invite code.",
    description:
      "Sign-in is already complete. Redeem one valid invitation code and this account will unlock SummonAI access.",
    signedIn: "Signed in account",
    panelTitle: "Invitation code",
    panelDescription:
      "Your invitation only needs to be redeemed once. After verification, we move you straight into the next step.",
    hallHint: "Once activation succeeds, you will go straight into the product.",
    resumeHint:
      "Once activation succeeds, you will continue to the page you originally requested.",
    switchHint: "Invited on another email or provider? Switch accounts before redeeming.",
  },
  zh: {
    eyebrow: "封闭测试访问",
    title: "输入邀请码，完成这个账户的激活。",
    description:
      "登录已经完成。兑换一枚有效邀请码后，这个账户就会正式获得 SummonAI 的访问权限。",
    signedIn: "当前已登录账户",
    panelTitle: "邀请码",
    panelDescription:
      "邀请码只需要兑换一次。验证通过后，系统会立刻带你继续下一步。",
    hallHint: "激活完成后，你会直接进入产品。",
    resumeHint: "激活完成后，你会继续回到刚才准备进入的页面。",
    switchHint: "如果邀请发给了别的邮箱或别的登录方式，请先切换账户再兑换。",
  },
} as const;

export default async function ActivatePage({
  params,
  searchParams,
}: ActivatePageProps) {
  const { locale } = await params;
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const query = await searchParams;
  const accessState = await getProductAccessState();
  const defaultRedirectTarget = `/${normalizedLocale}/app` as const;
  const redirectTarget = normalizeInternalRedirectTarget(query.redirect, defaultRedirectTarget);
  const copy = COPY[normalizedLocale];
  const completionHint =
    redirectTarget === defaultRedirectTarget ? copy.hallHint : copy.resumeHint;

  if (!accessState.isSignedIn) {
    redirect(`/${normalizedLocale}/login?next=${encodeURIComponent(redirectTarget)}`);
  }

  if (!accessState.invitationCodeEnabled || accessState.isAdmin || accessState.isActivated) {
    redirect(redirectTarget);
  }

  return (
    <AuthShell locale={normalizedLocale}>
      <section className="grid w-full gap-8 overflow-hidden rounded-[2.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(17,17,20,0.96))] p-8 shadow-[0_36px_140px_-60px_rgba(139,92,246,0.55)] lg:grid-cols-[minmax(0,0.95fr)_420px] lg:p-10">
        <div className="max-w-lg self-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold tracking-[0.22em] text-white/62 uppercase">
            {copy.eyebrow}
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-white/72">{copy.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white/88">
              {copy.signedIn}
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65">
              {accessState.email ?? accessState.userId}
            </div>
          </div>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/56">{completionHint}</p>
          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm leading-7 text-white/62">{copy.switchHint}</p>
            <SessionExitButton
              className="mt-3 h-11 rounded-2xl border border-white/10 bg-transparent px-4 text-white hover:bg-white/8"
              locale={normalizedLocale}
              mode="switch"
              nextHref={redirectTarget}
            />
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-white/10 bg-black/24 p-6 backdrop-blur-xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-white/56 uppercase">
            {copy.panelTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-white/62">{copy.panelDescription}</p>
          <Suspense fallback={null}>
            <ActivateForm locale={normalizedLocale} />
          </Suspense>
        </div>
      </section>
    </AuthShell>
  );
}
