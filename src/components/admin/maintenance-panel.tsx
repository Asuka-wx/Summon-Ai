"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type AdminMaintenancePanelProps = {
  locale: "en" | "zh";
};

type MaintenanceResponse = {
  enabled?: boolean;
  error?: string;
  message?: string;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      statusTitle: "当前状态",
      enabled: "维护模式已开启",
      disabled: "维护模式已关闭",
      enabledDescription:
        "Relay 会向所有 SDK 连接发送 4007，客户端进入低频探测模式。",
      disabledDescription: "平台当前允许 Agent 正常连接与服务。",
      refresh: "刷新状态",
      actionTitle: "切换维护模式",
      actionDescription:
        "此操作需要管理员身份。开启维护时，服务端会将 active 任务统一暂停。",
      enable: "开启维护",
      disable: "关闭维护",
      pending: "提交中...",
      responseTitle: "接口反馈",
      idleMessage: "尚未执行切换操作。",
      unauthorized: "当前账号没有管理员权限，或需要先完成 2FA 验证。",
      failed: "维护模式切换失败，请稍后重试。",
    };
  }

  return {
    statusTitle: "Current status",
    enabled: "Maintenance mode is enabled",
    disabled: "Maintenance mode is disabled",
    enabledDescription:
      "Relay will close SDK connections with code 4007 so clients can enter low-frequency probing mode.",
    disabledDescription: "The platform currently allows agents to connect and serve normally.",
    refresh: "Refresh status",
    actionTitle: "Toggle maintenance mode",
    actionDescription:
      "This action requires admin access. Enabling maintenance pauses active tasks on the server.",
    enable: "Enable maintenance",
    disable: "Disable maintenance",
    pending: "Submitting...",
    responseTitle: "API response",
    idleMessage: "No toggle request has been sent yet.",
    unauthorized: "The current account is not an admin, or 2FA verification is still required.",
    failed: "Failed to toggle maintenance mode. Please try again.",
  };
}

export function AdminMaintenancePanel({ locale }: AdminMaintenancePanelProps) {
  const copy = getCopy(locale);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  async function loadStatus() {
    const result = await fetch("/api/v1/admin/maintenance")
      .then((res) => res.json() as Promise<MaintenanceResponse>)
      .catch(() => null);

    setEnabled(typeof result?.enabled === "boolean" ? result.enabled : null);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleToggle(nextEnabled: boolean) {
    setIsSubmitting(true);
    setResponseMessage(null);

    try {
      const response = await fetch("/api/v1/admin/maintenance", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          enabled: nextEnabled,
        }),
      });
      const result = (await response.json()) as MaintenanceResponse;

      if (!response.ok) {
        setResponseMessage(
          result.error === "admin_required" || result.error === "mfa_required"
            ? copy.unauthorized
            : result.message ?? copy.failed,
        );
        return;
      }

      setEnabled(Boolean(result.enabled));
      setResponseMessage(
        locale === "zh"
          ? `维护模式已${result.enabled ? "开启" : "关闭"}。`
          : `Maintenance mode ${result.enabled ? "enabled" : "disabled"}.`,
      );
    } catch {
      setResponseMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.statusTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {enabled ? copy.enabledDescription : copy.disabledDescription}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadStatus()}>
            {copy.refresh}
          </Button>
        </div>

        <div className="mt-8 rounded-3xl border border-border/70 bg-background/75 p-5">
          <p className="text-sm font-medium text-foreground">
            {enabled ? copy.enabled : copy.disabled}
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.actionTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.actionDescription}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            disabled={isSubmitting || enabled === true}
            type="button"
            onClick={() => void handleToggle(true)}
          >
            {isSubmitting && enabled !== true ? copy.pending : copy.enable}
          </Button>
          <Button
            disabled={isSubmitting || enabled === false}
            type="button"
            variant="outline"
            onClick={() => void handleToggle(false)}
          >
            {isSubmitting && enabled !== false ? copy.pending : copy.disable}
          </Button>
        </div>

        <div className="mt-8 rounded-3xl border border-border/70 bg-background/75 p-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {copy.responseTitle}
          </p>
          <p className="mt-3 text-sm text-foreground">
            {responseMessage ?? copy.idleMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
