"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ToolboxItem = {
  last_used_at: string;
  use_count: number;
  agent: {
    id: string;
    name: string;
    tagline: string;
    price_per_call: number;
    avg_rating: number | null;
  };
};

type ToolboxPanelProps = {
  locale: "en" | "zh";
  items: ToolboxItem[];
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      empty: "开始使用 Agent 后，常用记录会出现在这里。",
      uses: "使用次数",
      launch: "一键发起",
      launching: "发起中...",
      prompt: "输入本次任务需求",
      openProfile: "查看详情",
      success: "任务已创建，正在跳转。",
      failed: "创建任务失败，请稍后重试。",
    };
  }

  return {
    empty: "Once you start working with agents, your toolbox will appear here.",
    uses: "Uses",
    launch: "Launch task",
    launching: "Launching...",
    prompt: "Describe the task you want to start",
    openProfile: "Open profile",
    success: "Task created. Redirecting...",
    failed: "Task creation failed. Please try again.",
  };
}

export function ToolboxPanel({ locale, items }: ToolboxPanelProps) {
  const copy = getCopy(locale);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function launchTask(agentId: string) {
    const prompt = drafts[agentId]?.trim() ?? "";
    if (!prompt) {
      setMessage(copy.failed);
      return;
    }

    setActiveId(agentId);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/tasks/direct", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          prompt,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.task_id) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setMessage(copy.success);
      window.location.assign(`/${locale}/tasks/${payload.task_id}`);
    } catch {
      setMessage(copy.failed);
    } finally {
      setActiveId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-sm text-muted-foreground">
        {copy.empty}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article
          key={item.agent.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                {item.agent.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.agent.tagline}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                {copy.uses}: {item.use_count} · ${item.agent.price_per_call}/round · rating{" "}
                {item.agent.avg_rating ?? 0}
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              href={`/${locale}/agents/${item.agent.id}`}
            >
              {copy.openProfile}
            </a>
          </div>

          <div className="mt-5 grid gap-3">
            <textarea
              className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.prompt}
              value={drafts[item.agent.id] ?? ""}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [item.agent.id]: event.target.value }))
              }
            />
            <div className="flex justify-end">
              <Button
                disabled={activeId === item.agent.id || !(drafts[item.agent.id]?.trim())}
                type="button"
                onClick={() => void launchTask(item.agent.id)}
              >
                {activeId === item.agent.id ? copy.launching : copy.launch}
              </Button>
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
