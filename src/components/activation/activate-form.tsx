"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect-target";
import { Button } from "@/components/ui/button";

type ActivateFormProps = {
  locale: "en" | "zh";
};

const ERROR_MESSAGES = {
  CODE_NOT_FOUND: {
    en: "Invalid invitation code. Please check and try again.",
    zh: "邀请码无效，请检查后重试。",
  },
  CODE_DEACTIVATED: {
    en: "This invitation code has been deactivated.",
    zh: "该邀请码已被停用。",
  },
  CODE_EXPIRED: {
    en: "This invitation code has expired.",
    zh: "该邀请码已过期。",
  },
  CODE_EXHAUSTED: {
    en: "This invitation code has reached its usage limit.",
    zh: "该邀请码已达到使用上限。",
  },
  ALREADY_USED: {
    en: "You have already used this code.",
    zh: "你已经使用过这个邀请码。",
  },
} as const;

const FORM_COPY = {
  en: {
    fieldLabel: "Invitation code",
    fieldHint: "Redeem the code sent to this account",
    helper: "Your invite is attached to the signed-in account immediately after redemption.",
    placeholder: "XXXXXXXX",
    submit: "Unlock My Access",
    submitting: "Activating...",
    fallbackError: "Activation failed. Please try again.",
  },
  zh: {
    fieldLabel: "邀请码",
    fieldHint: "兑换发给当前账户的邀请码",
    helper: "兑换成功后，这个邀请会立即绑定到当前已登录账户。",
    placeholder: "XXXXXXXX",
    submit: "解锁我的访问权限",
    submitting: "正在激活...",
    fallbackError: "激活失败，请稍后重试。",
  },
} as const;

export function ActivateForm({ locale }: ActivateFormProps) {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const copy = FORM_COPY[locale];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const normalizedCode = code.replace(/\s+/g, "").toUpperCase().replace(/^SA-/, "");
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: `SA-${normalizedCode}`,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const localized =
          ERROR_MESSAGES[payload.code as keyof typeof ERROR_MESSAGES]?.[locale] ??
          copy.fallbackError;
        setErrorMessage(localized);
        return;
      }

      const defaultRedirectTarget = `/${locale}/app` as const;
      const redirectTarget = normalizeInternalRedirectTarget(
        searchParams.get("redirect"),
        defaultRedirectTarget,
      );
      window.location.assign(redirectTarget);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-white/86" htmlFor="invitation-code">
            {copy.fieldLabel}
          </label>
          <span className="text-xs text-white/45">{copy.fieldHint}</span>
        </div>
        <div className="flex items-center rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.05)] p-1 shadow-inner shadow-black/20 transition-colors focus-within:border-white/20 focus-within:bg-[rgba(255,255,255,0.08)]">
          <span className="flex shrink-0 items-center rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold tracking-[0.28em] text-white/78">
            SA-
          </span>
          <input
            id="invitation-code"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            className="w-full bg-transparent px-4 py-3 text-sm uppercase tracking-[0.28em] text-white placeholder:text-white/28 focus:outline-none"
            onChange={(event) => setCode(event.target.value)}
            placeholder={copy.placeholder}
            required
            spellCheck={false}
            value={code}
          />
        </div>
      </div>
      {errorMessage ? (
        <p className="rounded-[1.25rem] border border-[#FCA5A5]/25 bg-[#7F1D1D]/15 px-4 py-3 text-sm text-[#FECACA]">
          {errorMessage}
        </p>
      ) : null}
      <p className="text-sm leading-7 text-white/54">{copy.helper}</p>
      <Button
        className="h-12 w-full rounded-2xl bg-white font-medium text-[#18181B] shadow-[0_18px_38px_-24px_rgba(255,255,255,0.55)] transition-all duration-200 hover:bg-white/96"
        disabled={isSubmitting || code.trim().length === 0}
        type="submit"
      >
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
