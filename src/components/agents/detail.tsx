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
    category_p95_price?: number;
  };
  creator?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  demos?: Array<{
    id: string;
    title: string;
    messages: Array<{
      role: "user" | "agent";
      content: string;
    }>;
  }>;
  ratings?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    tip_amount: number;
    created_at: string;
    user?: {
      display_name?: string;
      avatar_url?: string | null;
    } | null;
  }>;
  similarAgents?: Array<{
    id: string;
    name: string;
    tagline: string;
    price_per_call: number;
    avg_rating: number | null;
  }>;
  viewer: {
    is_owner: boolean;
    has_used_seed: boolean;
    can_use_free_trial: boolean;
    next_use_label: string;
  };
};

export function AgentDetail({
  locale,
  agent,
  creator,
  demos = [],
  ratings = [],
  similarAgents = [],
  viewer,
}: AgentDetailProps) {
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
    <section className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
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
              <span
                key={category}
                className="rounded-full border border-border bg-background px-3 py-1"
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>${agent.price_per_call}/round</p>
            <p>rating {agent.avg_rating ?? 0} ({agent.rating_count ?? 0})</p>
            <p>{locale === "zh" ? "累计任务" : "Total tasks"}: {agent.total_tasks ?? 0}</p>
            <p>{locale === "zh" ? "健康度" : "Health"}: {agent.health_score ?? 0}</p>
            <p>{locale === "zh" ? "剩余种子名额" : "Seed slots left"}: {agent.seed_free_remaining ?? 0}</p>
            <p>{locale === "zh" ? "支持语言" : "Languages"}: {(agent.supported_languages ?? []).join(", ")}</p>
            {typeof agent.category_p95_price === "number" &&
            agent.price_per_call > agent.category_p95_price ? (
              <p className="rounded-2xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-amber-950">
                {locale === "zh"
                  ? "该 Agent 定价高于同类 95% 的 Agent。"
                  : "This agent is priced above the 95th percentile of its category."}
              </p>
            ) : null}
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
      </div>

      {creator ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {locale === "zh" ? "创作者" : "Creator"}
          </p>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {creator.display_name}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{creator.bio ?? "-"}</p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              href={`/${locale}/creators/${creator.id}`}
            >
              {locale === "zh" ? "查看主页" : "Open creator page"}
            </a>
          </div>
        </section>
      ) : null}

      {demos.length > 0 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Demo</p>
          <div className="mt-6 grid gap-4">
            {demos.map((demo) => (
              <article
                key={demo.id}
                className="rounded-3xl border border-border/70 bg-background/75 p-5"
              >
                <h3 className="text-lg font-semibold text-foreground">{demo.title}</h3>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  {demo.messages.map((item, index) => (
                    <p key={`${demo.id}-${index}`}>
                      {item.role}: {item.content}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {ratings.length > 0 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {locale === "zh" ? "评价" : "Ratings"}
          </p>
          <div className="mt-6 grid gap-4">
            {ratings.map((rating) => (
              <article
                key={rating.id}
                className="rounded-3xl border border-border/70 bg-background/75 p-5"
              >
                <p className="text-sm font-medium text-foreground">
                  {rating.user?.display_name ?? "User"} · {rating.rating}/5
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{rating.comment ?? "-"}</p>
                {rating.tip_amount > 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    tip ${rating.tip_amount.toFixed(2)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {similarAgents.length > 0 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {locale === "zh" ? "相似 Agent" : "Similar agents"}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {similarAgents.map((item) => (
              <a
                key={item.id}
                href={`/${locale}/agents/${item.id}`}
                className="rounded-3xl border border-border/70 bg-background/75 p-5 hover:bg-accent"
              >
                <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.tagline}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  ${item.price_per_call}/round · rating {item.avg_rating ?? 0}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
