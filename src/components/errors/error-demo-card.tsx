"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

type ErrorDemoCardProps = {
  locale: "en" | "zh";
};

type DemoError = "unauthorized" | "token_expired" | "validation_error" | "captcha_required";

const DEMO_ERRORS: DemoError[] = [
  "unauthorized",
  "token_expired",
  "validation_error",
  "captcha_required",
];

export function ErrorDemoCard({ locale }: ErrorDemoCardProps) {
  const t = useTranslations("uploadLab.errorDemo");
  const [selectedError, setSelectedError] = useState<DemoError>("unauthorized");
  const [result, setResult] = useState<{
    error: string;
    localizedMessage: string;
    rawMessage: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runDemo() {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/v1/demo/auth-required?error=${selectedError}`);
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      setResult({
        error: payload.error ?? "unknown_error",
        localizedMessage: getErrorMessage(payload.error ?? "unknown_error", locale),
        rawMessage: payload.message ?? "Missing message",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {t("eyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("title")}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {DEMO_ERRORS.map((errorCode) => (
          <button
            key={errorCode}
            className={
              errorCode === selectedError
                ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground"
            }
            onClick={() => setSelectedError(errorCode)}
            type="button"
          >
            {errorCode}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <Button disabled={isLoading} onClick={runDemo}>
          {isLoading ? t("loading") : t("action")}
        </Button>
      </div>

      {result ? (
        <div className="mt-6 grid gap-4 rounded-3xl border border-border/70 bg-background/70 p-5">
          <p className="text-sm">
            <span className="font-medium">{t("errorCodeLabel")}:</span> {result.error}
          </p>
          <p className="text-sm">
            <span className="font-medium">{t("localizedLabel")}:</span> {result.localizedMessage}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("rawLabel")}:</span> {result.rawMessage}
          </p>
        </div>
      ) : null}
    </section>
  );
}
