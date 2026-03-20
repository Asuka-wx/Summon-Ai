"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type WithdrawalsManagerProps = {
  locale: "en" | "zh";
  initialWithdrawals: Array<{
    id: string;
    status: string;
    amount: number | null;
    tx_hash?: string | null;
  }>;
};

export function WithdrawalsManager({
  locale,
  initialWithdrawals,
}: WithdrawalsManagerProps) {
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [txHashes, setTxHashes] = useState<Record<string, string>>(
    Object.fromEntries(
      initialWithdrawals.map((withdrawal) => [withdrawal.id, withdrawal.tx_hash ?? ""]),
    ),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateWithdrawal(withdrawalId: string, status: string) {
    setSavingId(withdrawalId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/withdrawals/${encodeURIComponent(withdrawalId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status,
          tx_hash: txHashes[withdrawalId] ?? "",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? (locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again."));
        return;
      }

      setWithdrawals((current) =>
        current.map((withdrawal) =>
          withdrawal.id === withdrawalId
            ? {
                ...withdrawal,
                status,
                tx_hash: txHashes[withdrawalId] ?? "",
              }
            : withdrawal,
        ),
      );
    } catch {
      setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {withdrawals.map((withdrawal) => (
        <article
          key={withdrawal.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {withdrawal.status}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                {withdrawal.id}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ${Number(withdrawal.amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                placeholder="tx hash"
                value={txHashes[withdrawal.id] ?? ""}
                onChange={(event) =>
                  setTxHashes((current) => ({ ...current, [withdrawal.id]: event.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={savingId === withdrawal.id}
                  type="button"
                  variant="outline"
                  onClick={() => void updateWithdrawal(withdrawal.id, "completed")}
                >
                  {savingId === withdrawal.id ? "Saving..." : "completed"}
                </Button>
                <Button
                  disabled={savingId === withdrawal.id}
                  type="button"
                  variant="outline"
                  onClick={() => void updateWithdrawal(withdrawal.id, "failed")}
                >
                  {savingId === withdrawal.id ? "Saving..." : "failed"}
                </Button>
                <Button
                  disabled={savingId === withdrawal.id}
                  type="button"
                  variant="outline"
                  onClick={() => void updateWithdrawal(withdrawal.id, "stuck")}
                >
                  {savingId === withdrawal.id ? "Saving..." : "stuck"}
                </Button>
              </div>
            </div>
          </div>
        </article>
      ))}
      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
