"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ReportsManagerProps = {
  locale: "en" | "zh";
  initialReports: Array<{
    id: string;
    status: "pending" | "reviewing" | "resolved_action" | "resolved_dismissed";
    reason: string;
    description: string | null;
    admin_note?: string | null;
  }>;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      note: "处理备注",
      save: "提交处理",
      saving: "提交中...",
      failed: "处理失败，请稍后重试。",
    };
  }

  return {
    note: "Admin note",
    save: "Save review",
    saving: "Saving...",
    failed: "Review failed. Please try again.",
  };
}

export function ReportsManager({
  locale,
  initialReports,
}: ReportsManagerProps) {
  const copy = getCopy(locale);
  const [reports, setReports] = useState(initialReports);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(
      initialReports.map((report) => [report.id, report.admin_note ?? ""]),
    ),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateReport(
    reportId: string,
    status: ReportsManagerProps["initialReports"][number]["status"],
  ) {
    setSavingId(reportId);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status,
          admin_note: notes[reportId] ?? "",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status,
                admin_note: notes[reportId] ?? "",
              }
            : report,
        ),
      );
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {report.status}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {report.reason}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{report.description ?? "-"}</p>
          <textarea
            className="mt-4 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.note}
            value={notes[report.id] ?? ""}
            onChange={(event) =>
              setNotes((current) => ({ ...current, [report.id]: event.target.value }))
            }
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={savingId === report.id}
              type="button"
              variant="outline"
              onClick={() => void updateReport(report.id, "resolved_action")}
            >
              {savingId === report.id ? copy.saving : "resolved_action"}
            </Button>
            <Button
              disabled={savingId === report.id}
              type="button"
              variant="outline"
              onClick={() => void updateReport(report.id, "resolved_dismissed")}
            >
              {savingId === report.id ? copy.saving : "resolved_dismissed"}
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
