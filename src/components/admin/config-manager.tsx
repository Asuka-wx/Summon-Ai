"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ConfigManagerProps = {
  locale: "en" | "zh";
  initialEntries: Array<{
    key: string;
    value: unknown;
    description: string | null;
  }>;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      save: "保存配置",
      saving: "保存中...",
      description: "说明",
      value: "配置值（JSON）",
      success: "配置已更新。",
      failed: "更新失败，请稍后重试。",
    };
  }

  return {
    save: "Save config",
    saving: "Saving...",
    description: "Description",
    value: "Value (JSON)",
    success: "Config updated.",
    failed: "Update failed. Please try again.",
  };
}

export function ConfigManager({ locale, initialEntries }: ConfigManagerProps) {
  const copy = getCopy(locale);
  const [entries, setEntries] = useState(
    initialEntries.map((entry) => ({
      ...entry,
      valueText: JSON.stringify(entry.value, null, 2),
      descriptionText: entry.description ?? "",
    })),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveEntry(key: string) {
    const entry = entries.find((item) => item.key === key);

    if (!entry) {
      return;
    }

    setSavingKey(key);
    setMessage(null);

    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(entry.valueText);
      } catch {
        setMessage(copy.failed);
        return;
      }

      const response = await fetch(`/api/v1/admin/config/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          value: parsedValue,
          description: entry.descriptionText,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setEntries((current) =>
        current.map((item) =>
          item.key === key
            ? {
                ...item,
                description: payload.description ?? null,
              }
            : item,
        ),
      );
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="grid gap-4">
      {entries.map((entry) => (
        <article
          key={entry.key}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {entry.key}
          </p>
          <textarea
            className="mt-4 min-h-40 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            value={entry.valueText}
            onChange={(event) =>
              setEntries((current) =>
                current.map((item) =>
                  item.key === entry.key ? { ...item, valueText: event.target.value } : item,
                ),
              )
            }
          />
          <input
            className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.description}
            value={entry.descriptionText}
            onChange={(event) =>
              setEntries((current) =>
                current.map((item) =>
                  item.key === entry.key
                    ? { ...item, descriptionText: event.target.value }
                    : item,
                ),
              )
            }
          />
          <div className="mt-4 flex items-center gap-3">
            <Button
              disabled={savingKey === entry.key}
              type="button"
              onClick={() => void saveEntry(entry.key)}
            >
              {savingKey === entry.key ? copy.saving : copy.save}
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
