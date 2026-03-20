"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type InvitationCodeRecord = {
  id: string;
  code: string;
  batch_name: string | null;
  max_uses: number;
  use_count: number;
  is_active: boolean;
  note: string | null;
  expires_at: string | null;
};

type InvitationCodesManagerProps = {
  locale: "en" | "zh";
  initialCodes: InvitationCodeRecord[];
  initialStats: {
    total_codes: number;
    total_used: number;
    total_activated_users: number;
    by_batch: Array<{
      batch_name: string;
      total: number;
      used: number;
      remaining: number;
    }>;
  };
  initialSystemStatus: {
    invitation_code_enabled: boolean;
    total_users: number;
    activated_users: number;
    pending_users: number;
  };
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      statsTitle: "系统概览",
      createTitle: "生成邀请码",
      batchName: "批次名",
      count: "数量",
      maxUses: "最大使用次数",
      note: "备注",
      create: "生成",
      creating: "生成中...",
      enabled: "系统已开启",
      disabled: "系统已关闭",
      toggleOn: "开启邀请码系统",
      toggleOff: "关闭邀请码系统",
      codesTitle: "邀请码列表",
      active: "启用中",
      inactive: "已停用",
      save: "保存",
      saving: "保存中...",
      generated: "生成成功。",
      failed: "操作失败，请稍后重试。",
      totalCodes: "邀请码总数",
      totalUsed: "已使用次数",
      activatedUsers: "已激活用户",
      pendingUsers: "待激活用户",
    };
  }

  return {
    statsTitle: "System overview",
    createTitle: "Generate invitation codes",
    batchName: "Batch name",
    count: "Count",
    maxUses: "Max uses",
    note: "Note",
    create: "Generate",
    creating: "Generating...",
    enabled: "System enabled",
    disabled: "System disabled",
    toggleOn: "Enable invitation system",
    toggleOff: "Disable invitation system",
    codesTitle: "Invitation code list",
    active: "Active",
    inactive: "Inactive",
    save: "Save",
    saving: "Saving...",
    generated: "Codes generated.",
    failed: "Action failed. Please try again.",
    totalCodes: "Total codes",
    totalUsed: "Total uses",
    activatedUsers: "Activated users",
    pendingUsers: "Pending users",
  };
}

export function InvitationCodesManager({
  locale,
  initialCodes,
  initialStats,
  initialSystemStatus,
}: InvitationCodesManagerProps) {
  const copy = getCopy(locale);
  const [codes, setCodes] = useState(initialCodes);
  const [stats, setStats] = useState(initialStats);
  const [systemStatus, setSystemStatus] = useState(initialSystemStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingCodeId, setSavingCodeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    batch_name: "",
    count: "10",
    max_uses: "1",
    note: "",
  });
  const [codeNotes, setCodeNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialCodes.map((code) => [code.id, code.note ?? ""])),
  );

  async function refreshSystemState() {
    const [codesResponse, statsResponse, systemResponse] = await Promise.all([
      fetch("/api/v1/admin/invitation-codes").then((res) => res.json()),
      fetch("/api/v1/admin/invitation-codes/stats").then((res) => res.json()),
      fetch("/api/v1/admin/invitation-codes/system-status").then((res) => res.json()),
    ]).catch(() => [null, null, null]);

    if (codesResponse?.codes) {
      setCodes(codesResponse.codes);
    }

    if (statsResponse?.total_codes !== undefined) {
      setStats(statsResponse);
    }

    if (systemResponse?.invitation_code_enabled !== undefined) {
      setSystemStatus(systemResponse);
    }
  }

  async function createCodes() {
    setIsCreating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/admin/invitation-codes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          batch_name: form.batch_name || null,
          count: Number(form.count),
          max_uses: Number(form.max_uses),
          note: form.note || null,
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.generated);
      await refreshSystemState();
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleSystem(enabled: boolean) {
    setMessage(null);

    try {
      const response = await fetch("/api/v1/admin/invitation-codes/toggle", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      await refreshSystemState();
    } catch {
      setMessage(copy.failed);
    }
  }

  async function updateCode(id: string, isActive: boolean) {
    setSavingCodeId(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/invitation-codes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          is_active: isActive,
          note: codeNotes[id] ?? "",
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setCodes((current) =>
        current.map((code) =>
          code.id === id
            ? { ...code, is_active: isActive, note: codeNotes[id] ?? "" }
            : code,
        ),
      );
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingCodeId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.totalCodes, String(stats.total_codes)],
          [copy.totalUsed, String(stats.total_used)],
          [copy.activatedUsers, String(stats.total_activated_users)],
          [copy.pendingUsers, String(systemStatus.pending_users)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.statsTitle}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {systemStatus.invitation_code_enabled ? copy.enabled : copy.disabled}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void toggleSystem(true)}
            >
              {copy.toggleOn}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void toggleSystem(false)}
            >
              {copy.toggleOff}
            </Button>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {stats.by_batch.map((batch) => (
              <p key={batch.batch_name}>
                {batch.batch_name}: {batch.used}/{batch.total}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.createTitle}
          </h2>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.batchName}
              value={form.batch_name}
              onChange={(event) => setForm((current) => ({ ...current, batch_name: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              inputMode="numeric"
              placeholder={copy.count}
              value={form.count}
              onChange={(event) => setForm((current) => ({ ...current, count: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              inputMode="numeric"
              placeholder={copy.maxUses}
              value={form.max_uses}
              onChange={(event) => setForm((current) => ({ ...current, max_uses: event.target.value }))}
            />
            <textarea
              className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.note}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
            <Button disabled={isCreating} type="button" onClick={() => void createCodes()}>
              {isCreating ? copy.creating : copy.create}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.codesTitle}
        </h2>
        {codes.map((code) => (
          <article
            key={code.id}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {code.is_active ? copy.active : copy.inactive}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {code.code}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {code.batch_name ?? "default"} · {code.use_count}/{code.max_uses}
                </p>
              </div>
              <div className="w-full max-w-sm space-y-3">
                <textarea
                  className="min-h-20 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                  placeholder={copy.note}
                  value={codeNotes[code.id] ?? ""}
                  onChange={(event) =>
                    setCodeNotes((current) => ({ ...current, [code.id]: event.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={savingCodeId === code.id}
                    type="button"
                    variant="outline"
                    onClick={() => void updateCode(code.id, !code.is_active)}
                  >
                    {savingCodeId === code.id ? copy.saving : code.is_active ? copy.inactive : copy.active}
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
