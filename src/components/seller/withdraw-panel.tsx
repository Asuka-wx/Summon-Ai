"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type WithdrawPanelProps = {
  locale: "en" | "zh";
  initialAvailability: {
    balance: number;
    frozen: number;
    available: number;
  };
  initialWithdrawals: Array<{
    amount: number | null;
    status: string;
    created_at: string;
  }>;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      title: "申请提现",
      amount: "提现金额",
      submit: "发起提现",
      submitting: "提交中...",
      success: "提现请求已提交。",
      failed: "提现失败，请稍后重试。",
      available: "可提现余额",
      frozen: "冻结保护余额",
      history: "提现历史",
    };
  }

  return {
    title: "Request withdrawal",
    amount: "Amount",
    submit: "Submit withdrawal",
    submitting: "Submitting...",
    success: "Withdrawal request submitted.",
    failed: "Withdrawal failed. Please try again.",
    available: "Available balance",
    frozen: "Frozen protection balance",
    history: "Withdrawal history",
  };
}

export function WithdrawPanel({
  locale,
  initialAvailability,
  initialWithdrawals,
}: WithdrawPanelProps) {
  const copy = getCopy(locale);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState(initialAvailability);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);

  async function submit() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/seller/withdraw", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          payload?.code === "INSUFFICIENT_AVAILABLE_BALANCE"
            ? `${copy.failed} available=${payload.available} frozen=${payload.frozen}`
            : payload?.message ?? copy.failed,
        );
        return;
      }

      setMessage(copy.success);
      setAmount("");
      setAvailability((current) => ({
        ...current,
        available: Number(payload.available ?? current.available),
        frozen: Number(payload.frozen ?? current.frozen),
      }));
      setWithdrawals((current) => [
        {
          amount: Number(payload.amount ?? 0),
          status: payload.status ?? "processing",
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.title}
        </h2>
        <div className="mt-6 grid gap-4">
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>{copy.available}: ${availability.available.toFixed(2)}</p>
            <p>{copy.frozen}: ${availability.frozen.toFixed(2)}</p>
          </div>
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            inputMode="decimal"
            placeholder={copy.amount}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Button
            disabled={isSubmitting || Number(amount) <= 0}
            type="button"
            onClick={() => void submit()}
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.history}
        </h2>
        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
          {withdrawals.map((withdrawal, index) => (
            <p key={`${withdrawal.created_at}-${index}`}>
              ${Number(withdrawal.amount ?? 0).toFixed(2)} · {withdrawal.status}
            </p>
          ))}
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
