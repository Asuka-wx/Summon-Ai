"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type UserDetailActionsProps = {
  locale: "en" | "zh";
  userId: string;
  initialFrozen: boolean;
};

export function UserDetailActions({
  locale,
  userId,
  initialFrozen,
}: UserDetailActionsProps) {
  const [isFrozen, setIsFrozen] = useState(initialFrozen);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleFrozen(nextFrozen: boolean) {
    setIsWorking(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/admin/users/${encodeURIComponent(userId)}/${nextFrozen ? "freeze" : "unfreeze"}`,
        { method: "POST" },
      );

      if (!response.ok) {
        setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
        return;
      }

      setIsFrozen(nextFrozen);
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
        onClick={() => void toggleFrozen(!isFrozen)}
      >
        {isWorking
          ? locale === "zh"
            ? "处理中..."
            : "Working..."
          : isFrozen
            ? locale === "zh"
              ? "解冻账户"
              : "Unfreeze account"
            : locale === "zh"
              ? "冻结账户"
              : "Freeze account"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
