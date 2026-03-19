"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type AgentDetailProps = {
  locale: "en" | "zh";
  agent: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    categories: string[] | null;
    supported_languages: string[] | null;
    price_per_call: number;
    avg_rating: number | null;
    rating_count: number | null;
    total_tasks: number | null;
    status: string;
    is_seed: boolean | null;
    seed_free_remaining: number | null;
    health_score: number | null;
  };
  viewer: {
    is_owner: boolean;
    has_used_seed: boolean;
    can_use_free_trial: boolean;
    next_use_label: string;
  };
};

export function AgentDetail({ locale, agent, viewer }: AgentDetailProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const actionLabel = viewer.can_use_free_trial
    ? locale === "zh"
      ? "免费体验"
      : "Free trial"
    : agent.price_per_call > 0
      ? locale === "zh"
        ? "再次使用（付费）"
        : "Use again (paid)"
      : locale === "zh"
        ? "再次使用（免费）"
        : "Use again (free)";

  async function handleCreateTask() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/tasks/direct", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          prompt,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.task_id) {
        setMessage(result.message ?? "Request failed.");
        return;
      }

      router.push(`/${locale}/tasks/${result.task_id}`);
    } catch {
      setMessage(locale === "zh" ? "请求失败，请稍后重试。" : "Request failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          {agent.status}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-foreground">
          {agent.name}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{agent.tagline}</p>
        <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground">
          {agent.description}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(agent.categories ?? []).map((category) => (
            <span key={category} className="rounded-full border border-border bg-background px-3 py-1">
              {category}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="grid gap-3 text-sm text-muted-foreground">
          <p>${agent.price_per_call}/round</p>
          <p>⭐ {agent.avg_rating ?? 0} ({agent.rating_count ?? 0})</p>
          <p>{locale === "zh" ? "累计任务" : "Total tasks"}: {agent.total_tasks ?? 0}</p>
          <p>{locale === "zh" ? "健康度" : "Health"}: {agent.health_score ?? 0}</p>
          <p>{locale === "zh" ? "剩余种子名额" : "Seed slots left"}: {agent.seed_free_remaining ?? 0}</p>
          <p>{locale === "zh" ? "支持语言" : "Languages"}: {(agent.supported_languages ?? []).join(", ")}</p>
        </div>

        <div className="mt-8 space-y-4">
          <textarea
            className="min-h-32 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={locale === "zh" ? "输入你的需求描述" : "Describe what you need"}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button
            disabled={
              isSubmitting ||
              prompt.trim().length === 0 ||
              viewer.is_owner ||
              agent.status === "offline" ||
              agent.status === "busy"
            }
            onClick={() => void handleCreateTask()}
            type="button"
          >
            {isSubmitting ? (locale === "zh" ? "提交中..." : "Submitting...") : actionLabel}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </div>
    </section>
  );
}
