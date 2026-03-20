"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AlertsManagerProps = {
  locale: "en" | "zh";
  initialAlerts: Array<{
    id: string;
    alert_type: string;
    status: string;
    title: string;
    description: string | null;
    admin_note?: string | null;
  }>;
};

export function AlertsManager({ locale, initialAlerts }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialAlerts.map((alert) => [alert.id, alert.admin_note ?? ""])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateAlert(alertId: string, status: string) {
    setSavingId(alertId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/alerts/${encodeURIComponent(alertId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status,
          admin_note: notes[alertId] ?? "",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? (locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again."));
        return;
      }

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status,
                admin_note: notes[alertId] ?? "",
              }
            : alert,
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
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {alert.alert_type} · {alert.status}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {alert.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{alert.description ?? "-"}</p>
          <textarea
            className="mt-4 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={locale === "zh" ? "处理备注" : "Admin note"}
            value={notes[alert.id] ?? ""}
            onChange={(event) =>
              setNotes((current) => ({ ...current, [alert.id]: event.target.value }))
            }
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={savingId === alert.id}
              type="button"
              variant="outline"
              onClick={() => void updateAlert(alert.id, "dismissed")}
            >
              {savingId === alert.id ? "Saving..." : "dismissed"}
            </Button>
            <Button
              disabled={savingId === alert.id}
              type="button"
              variant="outline"
              onClick={() => void updateAlert(alert.id, "confirmed")}
            >
              {savingId === alert.id ? "Saving..." : "confirmed"}
            </Button>
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
