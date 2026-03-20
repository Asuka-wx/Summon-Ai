"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type DepositPanelProps = {
  locale: "en" | "zh";
  depositAddress: string | null;
  currentBalance: number;
};

type DepositStatusResponse = {
  status?: "pending" | "confirming" | "confirmed" | "failed";
  confirmations?: number;
  amount?: number;
  balance_after?: number;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      address: "平台充值地址",
      txHash: "交易哈希",
      fromAddress: "付款钱包地址",
      submit: "提交充值哈希",
      submitting: "提交中...",
      refresh: "刷新状态",
      idle: "先完成链上转账，再把交易哈希粘贴到这里进行确认。",
      pending: "交易还未上链确认。",
      confirming: "链上确认中...",
      confirmed: "充值已确认。",
      failed: "充值失败，请检查哈希后重试。",
      noAddress: "当前环境还没有配置平台充值地址。",
      statusTitle: "确认状态",
      currentBalance: "当前余额",
    };
  }

  return {
    address: "Platform deposit address",
    txHash: "Transaction hash",
    fromAddress: "Sender wallet address",
    submit: "Submit deposit hash",
    submitting: "Submitting...",
    refresh: "Refresh status",
    idle: "Complete the onchain transfer first, then paste the hash here for confirmation.",
    pending: "The transaction has not been confirmed onchain yet.",
    confirming: "Waiting for onchain confirmations...",
    confirmed: "Deposit confirmed.",
    failed: "Deposit failed. Please verify the hash and try again.",
    noAddress: "The platform deposit address is not configured in this environment.",
    statusTitle: "Confirmation status",
    currentBalance: "Current balance",
  };
}

export function DepositPanel({
  locale,
  depositAddress,
  currentBalance,
}: DepositPanelProps) {
  const copy = getCopy(locale);
  const [txHash, setTxHash] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [response, setResponse] = useState<DepositStatusResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshStatus(hash: string) {
    if (!hash) {
      return;
    }

    const result = await fetch(`/api/v1/users/deposit/status/${encodeURIComponent(hash)}`)
      .then((res) => res.json() as Promise<DepositStatusResponse>)
      .catch(() => null);

    if (result) {
      setResponse(result);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      const result = await fetch("/api/v1/users/deposit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tx_hash: txHash,
          from_address: fromAddress,
        }),
      }).then((res) => res.json() as Promise<DepositStatusResponse>);

      setResponse(result);
    } catch {
      setResponse({ status: "failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusMessage =
    response?.status === "confirmed"
      ? copy.confirmed
      : response?.status === "confirming"
        ? `${copy.confirming} (${response.confirmations ?? 0})`
        : response?.status === "failed"
          ? copy.failed
          : response?.status === "pending"
            ? copy.pending
            : copy.idle;

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {copy.currentBalance}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              ${currentBalance.toFixed(2)}
            </p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {copy.address}
            </p>
            <p className="mt-2 break-all text-sm text-foreground">
              {depositAddress ?? copy.noAddress}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="grid gap-4">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.txHash}
            value={txHash}
            onChange={(event) => setTxHash(event.target.value)}
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.fromAddress}
            value={fromAddress}
            onChange={(event) => setFromAddress(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isSubmitting || !txHash || !fromAddress}
              type="button"
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? copy.submitting : copy.submit}
            </Button>
            <Button
              disabled={!txHash}
              type="button"
              variant="outline"
              onClick={() => void refreshStatus(txHash)}
            >
              {copy.refresh}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          {copy.statusTitle}
        </p>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{statusMessage}</p>
        {response?.amount ? (
          <p className="mt-3 text-sm text-foreground">
            +${response.amount.toFixed(2)}
            {response.balance_after !== undefined
              ? ` · balance $${response.balance_after.toFixed(2)}`
              : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}
