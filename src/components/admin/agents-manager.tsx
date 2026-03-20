"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type AgentsManagerProps = {
  locale: "en" | "zh";
  initialAgents: Array<{
    id: string;
    name: string;
    tagline: string;
    status: string;
    quality_status: string | null;
    health_score: number;
    avg_rating: number;
    total_tasks: number;
  }>;
};

export function AgentsManager({ locale, initialAgents }: AgentsManagerProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [message, setMessage] = useState<string | null>(null);

  async function patchAgent(
    agentId: string,
    payload: Record<string, unknown>,
  ) {
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

      setAgents((current) =>
        current.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                status: result.status ?? agent.status,
                quality_status: result.quality_status ?? agent.quality_status,
              }
            : agent,
        ),
      );
    } catch {
      setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
    }
  }

  return (
    <div className="grid gap-4">
      {agents.map((agent) => (
        <article
          key={agent.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {agent.status} · {agent.quality_status}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                {agent.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{agent.tagline}</p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>health {agent.health_score.toFixed(2)}</p>
              <p>rating {agent.avg_rating.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  href={`/${locale}/admin/agents/${agent.id}`}
                >
                  {locale === "zh" ? "查看详情" : "View detail"}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void patchAgent(agent.id, { status: "offline" })}
                >
                  {locale === "zh" ? "强制下线" : "Force offline"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void patchAgent(agent.id, {
                      quality_status:
                        agent.quality_status === "hidden" ? "normal" : "hidden",
                    })
                  }
                >
                  {agent.quality_status === "hidden"
                    ? locale === "zh"
                      ? "恢复展示"
                      : "Restore"
                    : locale === "zh"
                      ? "隐藏"
                      : "Hide"}
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
