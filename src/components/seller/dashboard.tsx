"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type SellerDashboardProps = {
  locale: "en" | "zh";
};

type AgentRecord = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string;
  description: string;
  categories: string[] | null;
  supported_languages: string[] | null;
  status: string;
  price_per_call: number;
  active_tasks: number | null;
  max_concurrent: number | null;
  concurrency_level: number | null;
  sdk_version: string | null;
  sdk_last_heartbeat: string | null;
  quality_status: string | null;
  health_score: number | null;
  avg_rating: number | null;
  rating_count: number | null;
  total_tasks: number | null;
  total_earnings: number | null;
  total_tips: number | null;
  is_seed: boolean | null;
  seed_free_remaining: number | null;
  seed_max_rounds: number | null;
  created_at: string;
};

type AgentsResponse = {
  agents?: AgentRecord[];
  error?: string;
  message?: string;
};

type CreateAgentResponse = {
  agent?: AgentRecord;
  apiKey?: string;
  error?: string;
  message?: string;
};

type UpdateAgentResponse = {
  agent?: AgentRecord;
  error?: string;
  message?: string;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      summaryTitle: "概览",
      summaryDescription: "这里汇总你当前的 Agent 数量、在线情况和测试入口。",
      totalAgents: "Agent 总数",
      onlineAgents: "在线 Agent",
      hiddenAgents: "隐藏 Agent",
      connectLab: "打开连接实验室",
      registerTitle: "注册新 Agent",
      registerDescription: "提交基础资料后会立即签发一次性 API Key，请及时保存。",
      name: "名称",
      tagline: "一句话介绍",
      description: "详细描述",
      categories: "分类",
      languages: "支持语言",
      price: "每回合价格（USDC）",
      submit: "创建 Agent",
      submitting: "创建中...",
      latestKey: "最近签发的 API Key",
      latestKeyHint: "该 Key 只会在创建成功后显示一次。",
      noKey: "暂未创建新的 Agent。",
      listTitle: "我的 Agent",
      listDescription: "查看质量状态、种子额度、心跳时间，并切换在线状态。",
      empty: "你还没有创建任何 Agent。",
      status: "状态",
      quality: "质量",
      seed: "种子额度",
      heartbeat: "最近心跳",
      test: "测试连接",
      online: "上线",
      offline: "下线",
      retiring: "退休",
      archived: "下架",
      edit: "编辑资料",
      save: "保存修改",
      cancel: "取消",
      saving: "提交中...",
      loadFailed: "拉取 Agent 列表失败。",
      createFailed: "创建 Agent 失败。",
      updateFailed: "更新 Agent 资料失败。",
      statusFailed: "状态切换失败。",
      categoriesHint: "用逗号分隔，例如 coding, research",
      languagesHint: "用逗号分隔，例如 en, zh",
      maintenance: "维护模式已开启",
    };
  }

  return {
    summaryTitle: "Overview",
    summaryDescription: "Track your current agent inventory, online footprint, and testing entrypoints.",
    totalAgents: "Total agents",
    onlineAgents: "Online agents",
    hiddenAgents: "Hidden agents",
    connectLab: "Open connect lab",
    registerTitle: "Register a new agent",
    registerDescription: "A new API key is issued on creation and shown once. Save it immediately.",
    name: "Name",
    tagline: "Tagline",
    description: "Description",
    categories: "Categories",
    languages: "Languages",
    price: "Price per round (USDC)",
    submit: "Create agent",
    submitting: "Creating...",
    latestKey: "Latest issued API key",
    latestKeyHint: "This key is shown only once right after creation.",
    noKey: "No newly created agent yet.",
    listTitle: "My agents",
    listDescription: "Inspect quality state, seed slots, recent heartbeats, and toggle runtime status.",
    empty: "You have not created any agents yet.",
    status: "Status",
    quality: "Quality",
    seed: "Seed slots",
    heartbeat: "Last heartbeat",
    test: "Run test",
    online: "Go online",
    offline: "Go offline",
    retiring: "Retire",
    archived: "Archive",
    edit: "Edit",
    save: "Save changes",
    cancel: "Cancel",
    saving: "Submitting...",
    loadFailed: "Failed to load seller agents.",
    createFailed: "Failed to create agent.",
    updateFailed: "Failed to update agent profile.",
    statusFailed: "Failed to update agent status.",
    categoriesHint: "Comma-separated, e.g. coding, research",
    languagesHint: "Comma-separated, e.g. en, zh",
    maintenance: "Maintenance mode is enabled",
  };
}

export function SellerDashboard({ locale }: SellerDashboardProps) {
  const copy = getCopy(locale);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [latestApiKey, setLatestApiKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    categories: "",
    languages: "en",
    price: "0",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    tagline: "",
    description: "",
    categories: "",
    languages: "en",
    price: "0",
  });

  const loadAgents = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await fetch("/api/v1/seller/agents").then(
        (res) => res.json() as Promise<AgentsResponse>,
      );
      setAgents(result.agents ?? []);
      setMessage(result.message ?? null);
    } catch {
      setMessage(copy.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadFailed]);

  const loadMaintenance = useCallback(async () => {
    const result = await fetch("/api/v1/admin/maintenance")
      .then((res) => res.json())
      .catch(() => null);
    setMaintenanceEnabled(Boolean(result?.enabled));
  }, []);

  useEffect(() => {
    async function bootstrap() {
      await loadAgents();
      await loadMaintenance();
    }

    void bootstrap();
  }, [loadAgents, loadMaintenance]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      const result = await fetch("/api/v1/seller/agents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          categories: form.categories.split(",").map((item) => item.trim()).filter(Boolean),
          supported_languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean),
          price_per_call: Number.parseFloat(form.price) || 0,
        }),
      }).then((res) => res.json() as Promise<CreateAgentResponse>);

      if (!result.agent || !result.apiKey) {
        setMessage(result.message ?? copy.createFailed);
        return;
      }

      setLatestApiKey(result.apiKey);
      setForm({
        name: "",
        tagline: "",
        description: "",
        categories: "",
        languages: "en",
        price: "0",
      });
      await loadAgents();
    } catch {
      setMessage(copy.createFailed);
    } finally {
      setIsCreating(false);
    }
  }

  async function updateStatus(agentId: string, status: "online" | "offline" | "retiring" | "archived") {
    try {
      const result = await fetch(`/api/v1/seller/agents/${agentId}/status`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status }),
      }).then((res) => res.json());

      if (result.error) {
        setMessage(result.message ?? copy.statusFailed);
        return;
      }

      await loadAgents();
    } catch {
      setMessage(copy.statusFailed);
    }
  }

  async function handleSaveEdit(agentId: string) {
    setIsSavingEdit(true);

    try {
      const result = await fetch(`/api/v1/seller/agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          tagline: editForm.tagline,
          description: editForm.description,
          categories: editForm.categories.split(",").map((item) => item.trim()).filter(Boolean),
          supported_languages: editForm.languages.split(",").map((item) => item.trim()).filter(Boolean),
          price_per_call: Number.parseFloat(editForm.price) || 0,
        }),
      }).then((res) => res.json() as Promise<UpdateAgentResponse>);

      if (!result.agent) {
        setMessage(result.message ?? copy.updateFailed);
        return;
      }

      setEditingAgentId(null);
      await loadAgents();
    } catch {
      setMessage(copy.updateFailed);
    } finally {
      setIsSavingEdit(false);
    }
  }

  const summary = useMemo(
    () => ({
      total: agents.length,
      online: agents.filter((agent) => agent.status === "online" || agent.status === "busy").length,
      hidden: agents.filter((agent) => agent.quality_status === "hidden").length,
    }),
    [agents],
  );

  return (
    <section className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.summaryTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.summaryDescription}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              [copy.totalAgents, String(summary.total)],
              [copy.onlineAgents, String(summary.online)],
              [copy.hiddenAgents, String(summary.hidden)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-border/70 bg-background/75 p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              href={`/${locale}/seller/connect-lab`}
            >
              {copy.connectLab}
            </a>
            {maintenanceEnabled ? (
              <span className="inline-flex items-center rounded-2xl bg-amber-100 px-4 py-2 text-sm text-amber-950">
                {copy.maintenance}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.registerTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.registerDescription}</p>
          <form className="mt-6 grid gap-4" onSubmit={handleCreate}>
            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder={copy.name} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder={copy.tagline} value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} />
            <textarea className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder={copy.description} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder={copy.categoriesHint} value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value }))} />
            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" placeholder={copy.languagesHint} value={form.languages} onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))} />
            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" inputMode="decimal" placeholder={copy.price} value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
            <Button disabled={isCreating} type="submit">
              {isCreating ? copy.submitting : copy.submit}
            </Button>
          </form>
          <div className="mt-6 rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{copy.latestKey}</p>
            <p className="mt-3 break-all text-sm text-foreground">{latestApiKey ?? copy.noKey}</p>
            <p className="mt-2 text-xs text-muted-foreground">{copy.latestKeyHint}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.listTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.listDescription}</p>
        {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <div className="rounded-3xl border border-border/70 bg-background/75 p-5 text-sm text-muted-foreground">{copy.saving}</div>
          ) : agents.length === 0 ? (
            <div className="rounded-3xl border border-border/70 bg-background/75 p-5 text-sm text-muted-foreground">{copy.empty}</div>
          ) : (
            agents.map((agent) => (
              <article key={agent.id} className="rounded-3xl border border-border/70 bg-background/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <a className="text-xl font-semibold text-foreground hover:underline" href={`/${locale}/seller/agents/${agent.id}`}>
                        {agent.name}
                      </a>
                      <p className="text-sm text-muted-foreground">{agent.tagline}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {(agent.categories ?? []).map((category) => (
                        <span key={category} className="rounded-full border border-border bg-card px-3 py-1">
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <p>{copy.status}: {agent.status}</p>
                      <p>{copy.quality}: {agent.quality_status ?? "normal"}</p>
                      <p>{copy.seed}: {agent.seed_free_remaining ?? 0}/{agent.seed_max_rounds ?? 15}</p>
                      <p>{copy.heartbeat}: {agent.sdk_last_heartbeat ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void updateStatus(agent.id, "online")}>{copy.online}</Button>
                    <Button type="button" variant="outline" onClick={() => void updateStatus(agent.id, "offline")}>{copy.offline}</Button>
                    <Button type="button" variant="outline" onClick={() => void updateStatus(agent.id, "retiring")}>{copy.retiring}</Button>
                    <Button type="button" variant="outline" onClick={() => void updateStatus(agent.id, "archived")}>{copy.archived}</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingAgentId(agent.id);
                        setEditForm({
                          name: agent.name,
                          tagline: agent.tagline,
                          description: agent.description,
                          categories: (agent.categories ?? []).join(", "),
                          languages: (agent.supported_languages ?? ["en"]).join(", "),
                          price: String(agent.price_per_call ?? 0),
                        });
                      }}
                    >
                      {copy.edit}
                    </Button>
                    <a className="inline-flex items-center justify-center rounded-2xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent" href={`/${locale}/seller/connect-lab?agentId=${encodeURIComponent(agent.id)}`}>
                      {copy.test}
                    </a>
                  </div>
                </div>

                {editingAgentId === agent.id ? (
                  <div className="mt-6 grid gap-3 border-t border-border/70 pt-6">
                    <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                    <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={editForm.tagline} onChange={(event) => setEditForm((current) => ({ ...current, tagline: event.target.value }))} />
                    <textarea className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
                    <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={editForm.categories} onChange={(event) => setEditForm((current) => ({ ...current, categories: event.target.value }))} />
                    <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" value={editForm.languages} onChange={(event) => setEditForm((current) => ({ ...current, languages: event.target.value }))} />
                    <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm" inputMode="decimal" value={editForm.price} onChange={(event) => setEditForm((current) => ({ ...current, price: event.target.value }))} />
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={isSavingEdit} type="button" onClick={() => void handleSaveEdit(agent.id)}>
                        {isSavingEdit ? copy.saving : copy.save}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingAgentId(null)}>
                        {copy.cancel}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
