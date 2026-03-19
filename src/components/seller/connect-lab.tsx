"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type SellerConnectLabProps = {
  locale: "en" | "zh";
};

type TestResults = {
  self_eval: boolean;
  streaming: boolean;
  done_signal: boolean;
  heartbeat: boolean;
};

type TestResponse = {
  test_id?: string;
  run_id?: string;
  room_href?: string;
  results?: TestResults;
  error?: string;
  message?: string;
};

type TestRun = {
  id: string;
  task_id: string;
  status: string;
  self_eval: boolean;
  streaming: boolean;
  done_signal: boolean;
  heartbeat: boolean;
  created_at: string;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      maintenanceTitle: "维护模式",
      maintenanceEnabled: "平台当前处于维护模式，SDK 客户端将进入低频探测模式。",
      maintenanceDisabled: "平台当前未处于维护模式。",
      refreshMaintenance: "刷新维护状态",
      formTitle: "测试连接",
      formDescription:
        "此页调用 POST /api/v1/seller/agents/:id/test。当前登录用户必须拥有该 Agent。",
      inputLabel: "Agent ID",
      inputPlaceholder: "输入 Agent UUID",
      submit: "开始测试",
      testing: "测试中...",
      idleHint: "输入 Agent ID 后可以立即触发一次供给侧连接测试。",
      resultTitle: "测试结果",
      testId: "测试任务 ID",
      noResult: "尚未运行测试。",
      selfEval: "Self Eval",
      streaming: "Streaming",
      doneSignal: "Done Signal",
      heartbeat: "Heartbeat",
      pass: "通过",
      fail: "未通过",
      requestFailed: "请求失败，请稍后重试。",
      historyTitle: "最近测试记录",
      noHistory: "当前 Agent 还没有历史测试记录。",
      openRoom: "打开测试任务室",
    };
  }

  return {
    maintenanceTitle: "Maintenance Mode",
    maintenanceEnabled:
      "The platform is currently in maintenance mode. SDK clients should probe at a low frequency.",
    maintenanceDisabled: "The platform is currently not in maintenance mode.",
    refreshMaintenance: "Refresh maintenance status",
    formTitle: "Run connectivity test",
    formDescription:
      "This panel calls POST /api/v1/seller/agents/:id/test. The signed-in user must own the Agent.",
    inputLabel: "Agent ID",
    inputPlaceholder: "Enter Agent UUID",
    submit: "Run test",
    testing: "Testing...",
    idleHint: "Enter an Agent ID to trigger a seller-side connectivity test.",
    resultTitle: "Test results",
    testId: "Test task ID",
    noResult: "No test has been run yet.",
    selfEval: "Self Eval",
    streaming: "Streaming",
    doneSignal: "Done Signal",
    heartbeat: "Heartbeat",
    pass: "Pass",
    fail: "Fail",
    requestFailed: "Request failed. Please try again.",
    historyTitle: "Recent test runs",
    noHistory: "No persisted test runs for this agent yet.",
    openRoom: "Open test room",
  };
}

export function SellerConnectLab({ locale }: SellerConnectLabProps) {
  const copy = getCopy(locale);
  const searchParams = useSearchParams();
  const [agentId, setAgentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean | null>(null);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [history, setHistory] = useState<TestRun[]>([]);

  async function refreshMaintenanceStatus() {
    const result = await fetch("/api/v1/admin/maintenance")
      .then((res) => res.json())
      .catch(() => null);
    setMaintenanceEnabled(Boolean(result?.enabled));
  }

  useEffect(() => {
    void refreshMaintenanceStatus();
  }, []);

  useEffect(() => {
    const initialAgentId = searchParams.get("agentId");
    if (initialAgentId) {
      setAgentId(initialAgentId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!agentId) {
      setHistory([]);
      return;
    }

    async function loadHistory() {
      const result = await fetch(`/api/v1/seller/agents/${encodeURIComponent(agentId)}/test`)
        .then((res) => res.json())
        .catch(() => null);

      setHistory(result?.runs ?? []);
    }

    void loadHistory();
  }, [agentId, response?.run_id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const result = await fetch(`/api/v1/seller/agents/${encodeURIComponent(agentId)}/test`, {
        method: "POST",
      }).then((res) => res.json() as Promise<TestResponse>);

      setResponse(result);
    } catch {
      setResponse({
        message: copy.requestFailed,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const results = response?.results ?? null;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.maintenanceTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {maintenanceEnabled ? copy.maintenanceEnabled : copy.maintenanceDisabled}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void refreshMaintenanceStatus()}>
            {copy.refreshMaintenance}
          </Button>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.formTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.formDescription}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-foreground" htmlFor="agent-id">
              {copy.inputLabel}
            </label>
            <input
              id="agent-id"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              onChange={(event) => setAgentId(event.target.value)}
              placeholder={copy.inputPlaceholder}
              value={agentId}
            />
            <Button disabled={isLoading || agentId.trim().length === 0} type="submit">
              {isLoading ? copy.testing : copy.submit}
            </Button>
          </form>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.resultTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {response?.message ?? copy.idleHint}
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {copy.testId}
            </p>
            <p className="mt-2 break-all text-sm text-foreground">
              {response?.test_id ?? copy.noResult}
            </p>
            {response?.test_id ? (
              <a
                className="mt-3 inline-flex items-center justify-center rounded-2xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                href={response.room_href ?? `/${locale}/seller/test-room/${response.test_id}`}
              >
                {copy.openRoom}
              </a>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["self_eval", copy.selfEval],
              ["streaming", copy.streaming],
              ["done_signal", copy.doneSignal],
              ["heartbeat", copy.heartbeat],
            ].map(([key, label]) => {
              const passed = results?.[key as keyof TestResults] ?? false;

              return (
                <div
                  key={key}
                  className="rounded-3xl border border-border/70 bg-background/75 p-5"
                >
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p
                    className={`mt-3 text-sm ${
                      passed ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {passed ? copy.pass : copy.fail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {copy.historyTitle}
            </p>
            <div className="mt-3 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.noHistory}</p>
              ) : (
                history.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground"
                  >
                    <p className="font-medium text-foreground">{run.status}</p>
                    <p className="mt-1 break-all">{run.task_id}</p>
                    <p className="mt-1">
                      {run.self_eval ? "SE" : "--"} / {run.streaming ? "ST" : "--"} / {run.done_signal ? "DN" : "--"} / {run.heartbeat ? "HB" : "--"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
