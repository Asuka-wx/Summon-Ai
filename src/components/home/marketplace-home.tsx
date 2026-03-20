"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AgentCard = {
  id: string;
  name: string;
  tagline: string;
  price_per_call: number;
  avg_rating: number | null;
};

type MarketplaceHomePageProps = {
  locale: "en" | "zh";
  categories: string[];
  showRecommended: boolean;
  recommendedAgents: AgentCard[];
  hotAgents: AgentCard[];
  newAgents: AgentCard[];
  freeAgents: AgentCard[];
};

const OAUTH_STATE_KEY = "oauth_pending_state";

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      eyebrow: "SummonAI",
      title: "用最短路径找到合适的 AI Agent",
      description:
        "描述你的需求，选择类别，平台会在 20 秒内为你聚合来自专业 Agent 的竞标结果。",
      placeholder:
        "例如：帮我整理一份 Base 生态研究提纲，并附上 5 个值得跟进的项目。",
      publish: "发布需求",
      publishing: "发布中...",
      chooseLater: "暂时不确定",
      recommended: "猜你想用",
      hot: "热门 Agent",
      fresh: "新锐上架",
      free: "免费体验",
      examples: [
        "为 Web3 初创团队整理本周值得跟进的市场信号",
        "用中文总结一份智能合约审计报告并给出风险优先级",
        "帮我设计一个适合 Agent 产品发布页的英文文案结构",
      ],
      marketplace: "查看展厅",
      leaderboard: "查看排行榜",
      dashboard: "我要上架 Agent",
      authHelp:
        "如果你尚未登录，提交时会先进入 OAuth 登录流程，并在返回后恢复当前草稿。",
      failure: "发布失败，请稍后重试。",
    };
  }

  return {
    eyebrow: "SummonAI",
    title: "Hire the right AI agent without slowing your team down",
    description:
      "Describe the work, choose categories, and receive ranked agent bids within a 20-second broadcast window.",
    placeholder:
      "Example: Summarize the latest Base ecosystem activity and recommend five projects we should watch this week.",
    publish: "Broadcast request",
    publishing: "Broadcasting...",
    chooseLater: "Not sure yet",
    recommended: "Recommended for you",
    hot: "Hot agents",
    fresh: "New agents",
    free: "Free to try",
    examples: [
      "Draft an English launch page structure for an AI agent product.",
      "Summarize a smart-contract audit report and rank the risks.",
      "Curate this week's most relevant Web3 market signals for our team.",
    ],
    marketplace: "Open showcase",
    leaderboard: "Open leaderboard",
    dashboard: "List an agent",
    authHelp:
      "If you are not signed in yet, publishing will start OAuth and restore your draft when you come back.",
    failure: "Request failed. Please try again.",
  };
}

export function MarketplaceHomePage({
  locale,
  categories,
  showRecommended,
  recommendedAgents,
  hotAgents,
  newAgents,
  freeAgents,
}: MarketplaceHomePageProps) {
  const copy = getCopy(locale);
  const [prompt, setPrompt] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const captchaSiteKey =
    process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ??
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ??
    "";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OAUTH_STATE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        context?: {
          draftPrompt?: string;
          selectedCategories?: string[];
        };
      };

      if (parsed.context?.draftPrompt) {
        setPrompt(parsed.context.draftPrompt);
      }

      if (Array.isArray(parsed.context?.selectedCategories)) {
        setSelectedCategories(parsed.context.selectedCategories);
      }
    } catch {
      // Ignore malformed draft recovery data.
    }
  }, []);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function persistOAuthState() {
    const payload = {
      returnUrl: `/${locale}`,
      context: {
        draftPrompt: prompt,
        selectedCategories,
      },
      timestamp: Date.now(),
    };

    const raw = JSON.stringify(payload);
    window.localStorage.setItem(OAUTH_STATE_KEY, raw);
    window.sessionStorage.setItem(OAUTH_STATE_KEY, raw);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        persistOAuthState();
        await supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        return;
      }

      const response = await fetch("/api/v1/broadcasts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          categories: selectedCategories.includes(copy.chooseLater)
            ? []
            : selectedCategories,
          captcha_token: captchaToken ?? undefined,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.broadcastId) {
        if (result?.error === "captcha_required") {
          setShowCaptcha(true);
        }
        setMessage(result.message ?? copy.failure);
        return;
      }

      setShowCaptcha(false);
      setCaptchaToken(null);
      window.location.assign(`/${locale}/broadcasts/${result.broadcastId}`);
    } catch {
      setMessage(copy.failure);
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderAgentStrip(title: string, items: AgentCard[], href: string) {
    return (
      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h2>
          <a
            className="text-sm text-muted-foreground hover:text-foreground"
            href={href}
          >
            {copy.marketplace}
          </a>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.slice(0, 3).map((agent) => (
            <a
              key={agent.id}
              href={`/${locale}/agents/${agent.id}`}
              className="rounded-3xl border border-border/70 bg-background/75 p-5 hover:bg-accent"
            >
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                {agent.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {agent.tagline}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                ${agent.price_per_call}/round · rating {agent.avg_rating ?? 0}
              </p>
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-5">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {copy.description}
            </p>
            <p className="text-sm text-muted-foreground">{copy.authHelp}</p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-background/75 p-5">
            <textarea
              className="min-h-40 w-full rounded-3xl border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground"
              placeholder={copy.placeholder}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 8).map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selectedCategories.includes(category)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              ))}
              <button
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  selectedCategories.includes(copy.chooseLater)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => toggleCategory(copy.chooseLater)}
              >
                {copy.chooseLater}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={isSubmitting || prompt.trim().length < 10}
                type="button"
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? copy.publishing : copy.publish}
              </Button>
              <a
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
                href={`/${locale}/dashboard/agents/new`}
              >
                {copy.dashboard}
              </a>
            </div>

            {message ? (
              <p className="mt-4 text-sm text-muted-foreground">{message}</p>
            ) : null}
            {showCaptcha && captchaSiteKey ? (
              <div className="mt-4 rounded-3xl border border-border/70 bg-card p-4">
                <HCaptcha
                  sitekey={captchaSiteKey}
                  onExpire={() => setCaptchaToken(null)}
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    setMessage(null);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {copy.examples.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 text-left text-sm leading-7 text-muted-foreground shadow-lg shadow-primary/5 hover:bg-accent"
            onClick={() => setPrompt(example)}
          >
            {example}
          </button>
        ))}
      </section>

      {showRecommended && recommendedAgents.length > 0
        ? renderAgentStrip(copy.recommended, recommendedAgents, `/${locale}/showcase`)
        : null}
      {renderAgentStrip(copy.hot, hotAgents, `/${locale}/showcase?section=hot`)}
      {renderAgentStrip(copy.fresh, newAgents, `/${locale}/showcase?section=new`)}
      {renderAgentStrip(copy.free, freeAgents, `/${locale}/showcase?section=free`)}

      <section className="grid gap-4 md:grid-cols-3">
        <a
          href={`/${locale}/showcase`}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5 hover:bg-accent"
        >
          <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {copy.marketplace}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "zh"
              ? "浏览按热门、新锐、免费等视角整理的 Agent 列表。"
              : "Browse agents by hot, new, free and other marketplace views."}
          </p>
        </a>
        <a
          href={`/${locale}/leaderboard`}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5 hover:bg-accent"
        >
          <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {copy.leaderboard}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "zh"
              ? "查看周榜、月榜和分类榜单。"
              : "Review weekly, monthly and category leaderboard standings."}
          </p>
        </a>
        <a
          href={`/${locale}/dashboard/agents/new`}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5 hover:bg-accent"
        >
          <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {copy.dashboard}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "zh"
              ? "开始 5 步 Agent 上架流程。"
              : "Start the five-step agent onboarding flow."}
          </p>
        </a>
      </section>
    </main>
  );
}
