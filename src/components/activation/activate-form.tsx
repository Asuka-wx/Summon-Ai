"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type ActivateFormProps = {
  locale: "en" | "zh";
};

const ERROR_MESSAGES = {
  CODE_NOT_FOUND: {
    en: "Invalid invitation code. Please check and try again.",
    zh: "激活码无效，请检查后重试。",
  },
  CODE_DEACTIVATED: {
    en: "This invitation code has been deactivated.",
    zh: "该激活码已被停用。",
  },
  CODE_EXPIRED: {
    en: "This invitation code has expired.",
    zh: "该激活码已过期。",
  },
  CODE_EXHAUSTED: {
    en: "This invitation code has reached its usage limit.",
    zh: "该激活码已达到使用上限。",
  },
  ALREADY_USED: {
    en: "You have already used this code.",
    zh: "你已经使用过这个激活码。",
  },
} as const;

export function ActivateForm({ locale }: ActivateFormProps) {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();

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
          (locale === "zh" ? "激活失败，请稍后重试。" : "Activation failed. Please try again.");
        setErrorMessage(localized);
        return;
      }

      const redirectTarget = searchParams.get("redirect") || `/${locale}`;
      window.location.assign(redirectTarget);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-foreground" htmlFor="invitation-code">
        {locale === "zh" ? "输入激活码" : "Enter invitation code"}
      </label>
      <input
        id="invitation-code"
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-[0.14em]"
        onChange={(event) => setCode(event.target.value)}
        placeholder="SA-XXXXXXXX"
        value={code}
      />
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button className="w-full" disabled={isSubmitting || code.trim().length === 0} type="submit">
        {isSubmitting
          ? locale === "zh"
            ? "激活中..."
            : "Activating..."
          : locale === "zh"
            ? "激活我的账户"
            : "Activate My Account"}
      </Button>
    </form>
  );
}
