"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type NewAgentWizardProps = {
  locale: "en" | "zh";
  categories: string[];
};

type CreatedAgent = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  categories: string[] | null;
  supported_languages: string[] | null;
  status: string;
  price_per_call: number;
};

type ConnectivityResponse = {
  test_id?: string;
  room_href?: string;
  results?: {
    self_eval: boolean;
    streaming: boolean;
    done_signal: boolean;
    heartbeat: boolean;
  };
  message?: string;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      steps: [
        "1. 基本信息",
        "2. Demo 对话",
        "3. 安全配置",
        "4. SDK 测试",
        "5. 上线确认",
      ],
      stepOneTitle: "基本信息与定价",
      stepOneDescription: "先创建 Agent 主体，系统会立即签发 agent_id 和一次性 API Key。",
      name: "名称",
      tagline: "一句话介绍",
      description: "详细描述",
      categories: "分类",
      languages: "支持语言（逗号分隔）",
      price: "每回合价格（USDC）",
      createAgent: "创建 Agent",
      creating: "创建中...",
      stepTwoTitle: "Demo 对话",
      stepTwoDescription: "添加一段短 Demo，用来在公开详情页展示你的能力风格。",
      demoTitle: "Demo 标题",
      addMessage: "添加消息",
      removeMessage: "删除",
      saveDemo: "保存 Demo",
      savingDemo: "保存中...",
      stepThreeTitle: "安全环境配置",
      stepThreeDescription: "将以下环境变量写入本地运行时，不要把 API Key 提交到仓库。",
      stepFourTitle: "SDK 接入测试",
      stepFourDescription: "运行一次连通性测试，确认 self-eval、streaming、done signal 和 heartbeat 都能通过。",
      runTest: "运行测试",
      testing: "测试中...",
      stepFiveTitle: "上线确认",
      stepFiveDescription: "测试通过后，把 Agent 切到 online。后续你仍然可以在后台编辑资料和下线。",
      goLive: "立即上线",
      goingLive: "上线中...",
      openAgent: "打开 Agent 后台",
      openRoom: "打开测试任务室",
      success: "操作完成。",
      failed: "操作失败，请稍后重试。",
      apiKey: "一次性 API Key",
      agentId: "Agent ID",
      noAgent: "请先完成第一步。",
      testPassed: "通过",
      testFailed: "未通过",
    };
  }

  return {
    steps: [
      "1. Basics",
      "2. Demo",
      "3. Secure setup",
      "4. SDK test",
      "5. Go live",
    ],
    stepOneTitle: "Basic profile and pricing",
    stepOneDescription: "Create the agent first. The platform issues an agent_id and one-time API key immediately.",
    name: "Name",
    tagline: "Tagline",
    description: "Description",
    categories: "Categories",
    languages: "Languages (comma-separated)",
    price: "Price per round (USDC)",
    createAgent: "Create agent",
    creating: "Creating...",
    stepTwoTitle: "Demo conversations",
    stepTwoDescription: "Add a short demo so buyers can preview your style on the public profile.",
    demoTitle: "Demo title",
    addMessage: "Add message",
    removeMessage: "Remove",
    saveDemo: "Save demo",
    savingDemo: "Saving...",
    stepThreeTitle: "Secure runtime setup",
    stepThreeDescription: "Store these environment values locally and never commit the API key.",
    stepFourTitle: "SDK connectivity test",
    stepFourDescription: "Run a live test and confirm self-eval, streaming, done signal and heartbeat are all healthy.",
    runTest: "Run test",
    testing: "Testing...",
    stepFiveTitle: "Go-live confirmation",
    stepFiveDescription: "Once the checks pass, switch the agent online. You can still edit or retire it later.",
    goLive: "Go live",
    goingLive: "Going live...",
    openAgent: "Open agent dashboard",
    openRoom: "Open test room",
    success: "Action completed.",
    failed: "Action failed. Please try again.",
    apiKey: "One-time API key",
    agentId: "Agent ID",
    noAgent: "Complete step one first.",
    testPassed: "Pass",
    testFailed: "Fail",
  };
}

export function NewAgentWizard({ locale, categories }: NewAgentWizardProps) {
  const copy = getCopy(locale);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<ConnectivityResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    categories: [] as string[],
    languages: "en",
    price: "0",
  });
  const [demo, setDemo] = useState({
    title: "",
    messages: [
      { role: "user" as const, content: "" },
      { role: "agent" as const, content: "" },
    ],
  });

  const envSnippet = useMemo(() => {
    if (!createdAgent || !apiKey) {
      return "";
    }

    return [
      `SUMMONAI_AGENT_ID=${createdAgent.id}`,
      `SUMMONAI_API_KEY=${apiKey}`,
      `SUMMONAI_WS_URL=wss://ws.summonai.xyz/ws/sdk/connect`,
    ].join("\n");
  }, [apiKey, createdAgent]);

  async function createAgent() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/seller/agents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          categories: form.categories,
          supported_languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean),
          price_per_call: Number.parseFloat(form.price) || 0,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.agent || !payload?.apiKey) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setCreatedAgent(payload.agent);
      setApiKey(payload.apiKey);
      setStep(1);
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveDemo() {
    if (!createdAgent) {
      setMessage(copy.noAgent);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/seller/agents/${encodeURIComponent(createdAgent.id)}/demos`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(demo),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.demo) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setStep(2);
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runConnectivityTest() {
    if (!createdAgent) {
      setMessage(copy.noAgent);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/seller/agents/${encodeURIComponent(createdAgent.id)}/test`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as ConnectivityResponse | null;

      if (!response.ok || !payload) {
        setMessage(copy.failed);
        return;
      }

      setTestResponse(payload);
      setStep(4);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function goLive() {
    if (!createdAgent) {
      setMessage(copy.noAgent);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/seller/agents/${encodeURIComponent(createdAgent.id)}/toggle`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          online: true,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.agent) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setCreatedAgent((current) =>
        current
          ? {
              ...current,
              status: payload.agent.status,
            }
          : current,
      );
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-3 md:grid-cols-5">
        {copy.steps.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
              step === index
                ? "border-primary bg-primary text-primary-foreground"
                : index < step
                  ? "border-border bg-accent text-foreground"
                  : "border-border bg-card text-muted-foreground"
            }`}
            onClick={() => {
              if (index <= step) {
                setStep(index);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.stepOneTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.stepOneDescription}
          </p>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.name}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.tagline}
              value={form.tagline}
              onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
            />
            <textarea
              className="min-h-32 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.description}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 12).map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    form.categories.includes(category)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      categories: current.categories.includes(category)
                        ? current.categories.filter((item) => item !== category)
                        : [...current.categories, category],
                    }))
                  }
                >
                  {category}
                </button>
              ))}
            </div>
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.languages}
              value={form.languages}
              onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              inputMode="decimal"
              placeholder={copy.price}
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            />
            <Button disabled={isSubmitting} type="button" onClick={() => void createAgent()}>
              {isSubmitting ? copy.creating : copy.createAgent}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.stepTwoTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.stepTwoDescription}
          </p>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              placeholder={copy.demoTitle}
              value={demo.title}
              onChange={(event) => setDemo((current) => ({ ...current, title: event.target.value }))}
            />
            {demo.messages.map((messageItem, index) => (
              <div
                key={`${messageItem.role}-${index}`}
                className="rounded-3xl border border-border/70 bg-background/75 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <select
                    className="rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                    value={messageItem.role}
                    onChange={(event) =>
                      setDemo((current) => ({
                        ...current,
                        messages: current.messages.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, role: event.target.value as "user" | "agent" }
                            : item,
                        ),
                      }))
                    }
                  >
                    <option value="user">user</option>
                    <option value="agent">agent</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDemo((current) => ({
                        ...current,
                        messages: current.messages.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    {copy.removeMessage}
                  </Button>
                </div>
                <textarea
                  className="mt-3 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                  value={messageItem.content}
                  onChange={(event) =>
                    setDemo((current) => ({
                      ...current,
                      messages: current.messages.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, content: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDemo((current) => ({
                  ...current,
                  messages: [...current.messages, { role: "user", content: "" }],
                }))
              }
            >
              {copy.addMessage}
            </Button>
            <Button disabled={isSubmitting} type="button" onClick={() => void saveDemo()}>
              {isSubmitting ? copy.savingDemo : copy.saveDemo}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.stepThreeTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.stepThreeDescription}
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {copy.agentId}
              </p>
              <p className="mt-2 break-all text-sm text-foreground">{createdAgent?.id}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {copy.apiKey}
              </p>
              <p className="mt-2 break-all text-sm text-foreground">{apiKey}</p>
            </div>
          </div>
          <pre className="mt-6 overflow-x-auto rounded-3xl border border-border/70 bg-background/75 p-5 text-sm text-foreground">
            {envSnippet}
          </pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setStep(3)}>
              {copy.stepFourTitle}
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.stepFourTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.stepFourDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={isSubmitting} type="button" onClick={() => void runConnectivityTest()}>
              {isSubmitting ? copy.testing : copy.runTest}
            </Button>
            {createdAgent ? (
              <a
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                href={`/${locale}/seller/connect-lab?agentId=${encodeURIComponent(createdAgent.id)}`}
              >
                {copy.stepFourTitle}
              </a>
            ) : null}
          </div>
          {testResponse?.results ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Object.entries(testResponse.results).map(([key, passed]) => (
                <div
                  key={key}
                  className="rounded-3xl border border-border/70 bg-background/75 p-5"
                >
                  <p className="text-sm font-medium text-foreground">{key}</p>
                  <p className={`mt-3 text-sm ${passed ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {passed ? copy.testPassed : copy.testFailed}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {testResponse?.room_href ? (
            <a
              className="mt-6 inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              href={`/${locale}${testResponse.room_href}`}
            >
              {copy.openRoom}
            </a>
          ) : null}
          {testResponse?.results &&
          Object.values(testResponse.results).every(Boolean) ? (
            <div className="mt-6">
              <Button type="button" onClick={() => setStep(4)}>
                {copy.stepFiveTitle}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {copy.stepFiveTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {copy.stepFiveDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button disabled={isSubmitting} type="button" onClick={() => void goLive()}>
              {isSubmitting ? copy.goingLive : copy.goLive}
            </Button>
            {createdAgent ? (
              <a
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                href={`/${locale}/dashboard/agents/${createdAgent.id}`}
              >
                {copy.openAgent}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </section>
  );
}
