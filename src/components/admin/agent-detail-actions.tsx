"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AgentDetailActionsProps = {
  locale: "en" | "zh";
  agentId: string;
  initialStatus: string;
  initialQualityStatus: string | null;
};

export function AgentDetailActions({
  locale,
  agentId,
  initialStatus,
  initialQualityStatus,
}: AgentDetailActionsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [qualityStatus, setQualityStatus] = useState(initialQualityStatus ?? "normal");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/agents/${encodeURIComponent(agentId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.message ?? (locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again."));
        return;
      }

      if (payload.status) {
        setStatus(String(payload.status));
      }

      if (payload.quality_status) {
        setQualityStatus(String(payload.quality_status));
      }
    } catch {
      setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        disabled={isWorking}
        type="button"
        variant="outline"
        onClick={() => void patch({ status: "offline" })}
      >
        {isWorking ? (locale === "zh" ? "处理中..." : "Working...") : locale === "zh" ? "强制下线" : "Force offline"}
      </Button>
      <Button
        disabled={isWorking}
        type="button"
        variant="outline"
        onClick={() =>
          void patch({
            quality_status: qualityStatus === "hidden" ? "normal" : "hidden",
          })
        }
      >
        {qualityStatus === "hidden"
          ? locale === "zh"
            ? "恢复展示"
            : "Restore"
          : locale === "zh"
            ? "隐藏 Agent"
            : "Hide agent"}
      </Button>
      <p className="text-sm text-muted-foreground">
        {locale === "zh" ? "当前状态" : "Current"}: {status} / {qualityStatus}
      </p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
