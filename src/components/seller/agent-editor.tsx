"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type DemoRecord = {
  id: string;
  title: string;
  messages: Array<{
    role: "user" | "agent";
    content: string;
  }>;
};

type SellerAgentEditorProps = {
  locale: "en" | "zh";
  agent: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    categories: string[] | null;
    supported_languages: string[] | null;
    status: string;
    price_per_call: number;
    quality_status: string | null;
    health_score: number | null;
    avg_rating: number | null;
    total_tasks: number | null;
    total_earnings: number | null;
    total_tips: number | null;
    sdk_last_heartbeat: string | null;
  };
  demos: DemoRecord[];
  testRunCount: number;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      save: "保存资料",
      saving: "保存中...",
      title: "资料管理",
      runtime: "运行控制",
      demos: "Demo 对话",
      addDemo: "新增 Demo",
      updateDemo: "保存 Demo",
      deleteDemo: "删除 Demo",
      online: "上线",
      offline: "下线",
      retire: "下架",
      runTest: "运行测试",
      connectLab: "打开 SDK 测试页",
      detail: "指标概览",
      failed: "操作失败，请稍后重试。",
      success: "已更新。",
      demoTitle: "Demo 标题",
      userMessage: "用户消息",
      agentMessage: "Agent 消息",
    };
  }

  return {
    save: "Save profile",
    saving: "Saving...",
    title: "Profile management",
    runtime: "Runtime control",
    demos: "Demo conversations",
    addDemo: "Add demo",
    updateDemo: "Save demo",
    deleteDemo: "Delete demo",
    online: "Go online",
    offline: "Go offline",
    retire: "Retire",
    runTest: "Run test",
    connectLab: "Open connect lab",
    detail: "Metrics",
    failed: "Action failed. Please try again.",
    success: "Updated successfully.",
    demoTitle: "Demo title",
    userMessage: "User message",
    agentMessage: "Agent message",
  };
}

export function AgentEditor({
  locale,
  agent,
  demos,
  testRunCount,
}: SellerAgentEditorProps) {
  const copy = getCopy(locale);
  const [profile, setProfile] = useState({
    name: agent.name,
    tagline: agent.tagline,
    description: agent.description,
    categories: (agent.categories ?? []).join(", "),
    languages: (agent.supported_languages ?? ["en"]).join(", "),
    price: String(agent.price_per_call),
  });
  const [demoList, setDemoList] = useState(demos);
  const [newDemo, setNewDemo] = useState({
    title: "",
    user: "",
    agent: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingDemo, setIsSavingDemo] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  async function saveProfile() {
    setIsSavingProfile(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name,
          tagline: profile.tagline,
          description: profile.description,
          categories: profile.categories.split(",").map((item) => item.trim()).filter(Boolean),
          supported_languages: profile.languages.split(",").map((item) => item.trim()).filter(Boolean),
          price_per_call: Number.parseFloat(profile.price) || 0,
        }),
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function updateStatus(path: string, body?: Record<string, unknown>) {
    setIsChangingStatus(true);
    setMessage(null);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function createDemo() {
    setIsSavingDemo(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}/demos`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: newDemo.title,
          messages: [
            { role: "user", content: newDemo.user },
            { role: "agent", content: newDemo.agent },
          ],
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.demo) {
        setMessage(copy.failed);
        return;
      }

      setDemoList((current) => [...current, payload.demo]);
      setNewDemo({ title: "", user: "", agent: "" });
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSavingDemo(false);
    }
  }

  async function deleteDemo(demoId: string) {
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/seller/agents/${encodeURIComponent(agent.id)}/demos/${encodeURIComponent(demoId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setDemoList((current) => current.filter((demo) => demo.id !== demoId));
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    }
  }

  return (
    <section className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.title}
          </h2>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={profile.name}
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={profile.tagline}
              onChange={(event) => setProfile((current) => ({ ...current, tagline: event.target.value }))}
            />
            <textarea
              className="min-h-32 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={profile.description}
              onChange={(event) => setProfile((current) => ({ ...current, description: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={profile.categories}
              onChange={(event) => setProfile((current) => ({ ...current, categories: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={profile.languages}
              onChange={(event) => setProfile((current) => ({ ...current, languages: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              inputMode="decimal"
              value={profile.price}
              onChange={(event) => setProfile((current) => ({ ...current, price: event.target.value }))}
            />
            <Button disabled={isSavingProfile} type="button" onClick={() => void saveProfile()}>
              {isSavingProfile ? copy.saving : copy.save}
            </Button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.detail}
          </h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p>status: {agent.status}</p>
            <p>quality: {agent.quality_status ?? "normal"}</p>
            <p>health: {agent.health_score ?? 0}</p>
            <p>rating: {agent.avg_rating ?? 0}</p>
            <p>tasks: {agent.total_tasks ?? 0}</p>
            <p>earnings: ${agent.total_earnings ?? 0}</p>
            <p>tips: ${agent.total_tips ?? 0}</p>
            <p>heartbeat: {agent.sdk_last_heartbeat ?? "-"}</p>
            <p>tests: {testRunCount}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              disabled={isChangingStatus}
              type="button"
              variant="outline"
              onClick={() =>
                void updateStatus(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}/toggle`, {
                  online: true,
                })
              }
            >
              {copy.online}
            </Button>
            <Button
              disabled={isChangingStatus}
              type="button"
              variant="outline"
              onClick={() =>
                void updateStatus(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}/toggle`, {
                  online: false,
                })
              }
            >
              {copy.offline}
            </Button>
            <Button
              disabled={isChangingStatus}
              type="button"
              variant="outline"
              onClick={() =>
                void updateStatus(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}/retire`)
              }
            >
              {copy.retire}
            </Button>
            <Button
              disabled={isChangingStatus}
              type="button"
              variant="outline"
              onClick={() =>
                void updateStatus(`/api/v1/seller/agents/${encodeURIComponent(agent.id)}/test`)
              }
            >
              {copy.runTest}
            </Button>
            <a
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              href={`/${locale}/dashboard/connect-lab?agentId=${encodeURIComponent(agent.id)}`}
            >
              {copy.connectLab}
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {copy.demos}
        </h2>
        <div className="mt-6 grid gap-4">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <input
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.demoTitle}
              value={newDemo.title}
              onChange={(event) => setNewDemo((current) => ({ ...current, title: event.target.value }))}
            />
            <textarea
              className="mt-4 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.userMessage}
              value={newDemo.user}
              onChange={(event) => setNewDemo((current) => ({ ...current, user: event.target.value }))}
            />
            <textarea
              className="mt-4 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.agentMessage}
              value={newDemo.agent}
              onChange={(event) => setNewDemo((current) => ({ ...current, agent: event.target.value }))}
            />
            <Button className="mt-4" disabled={isSavingDemo} type="button" onClick={() => void createDemo()}>
              {isSavingDemo ? copy.saving : copy.addDemo}
            </Button>
          </div>
          {demoList.map((demo) => (
            <article
              key={demo.id}
              className="rounded-3xl border border-border/70 bg-background/75 p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {demo.title}
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {demo.messages.map((item, index) => (
                      <p key={`${demo.id}-${index}`}>
                        {item.role}: {item.content}
                      </p>
                    ))}
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => void deleteDemo(demo.id)}>
                  {copy.deleteDemo}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </section>
  );
}
