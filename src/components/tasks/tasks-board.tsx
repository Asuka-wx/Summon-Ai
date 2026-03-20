"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type TaskListItem = {
  id: string;
  status: string;
  phase?: string;
  total_charge?: number;
  end_reason?: string | null;
  agent?: {
    id?: string;
    name?: string;
    tagline?: string;
  };
  agents?: Array<{
    id?: string;
    name?: string;
    tagline?: string;
  }>;
};

type TasksBoardProps = {
  locale: "en" | "zh";
  tab: "active" | "paused" | "pending" | "completed";
  initialTasks: TaskListItem[];
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      open: "打开任务室",
      pause: "暂停",
      resume: "恢复",
      end: "结束",
      rate: "提交评价",
      submitting: "提交中...",
      success: "操作完成。",
      failed: "操作失败，请稍后重试。",
      rating: "评分（1-5）",
      tip: "打赏金额（可选）",
      comment: "评价内容（可选）",
      saveRating: "保存评价",
      noTasks: "当前没有可显示的任务。",
    };
  }

  return {
    open: "Open task room",
    pause: "Pause",
    resume: "Resume",
    end: "End",
    rate: "Submit rating",
    submitting: "Submitting...",
    success: "Action completed.",
    failed: "Action failed. Please try again.",
    rating: "Rating (1-5)",
    tip: "Tip amount (optional)",
    comment: "Comment (optional)",
    saveRating: "Save rating",
    noTasks: "There are no tasks to show right now.",
  };
}

export function TasksBoard({ locale, tab, initialTasks }: TasksBoardProps) {
  const copy = getCopy(locale);
  const [tasks, setTasks] = useState(initialTasks);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [ratingForms, setRatingForms] = useState<Record<string, { rating: string; tip: string; comment: string }>>(
    Object.fromEntries(initialTasks.map((task) => [task.id, { rating: "5", tip: "", comment: "" }])),
  );

  async function postAction(taskId: string, path: string, body?: Record<string, unknown>) {
    setActingId(taskId);
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

      if (path.endsWith("/pause")) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, status: "paused" } : task,
          ),
        );
      } else if (path.endsWith("/resume")) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, status: "active" } : task,
          ),
        );
      } else if (path.endsWith("/end")) {
        setTasks((current) =>
          current.map((task) =>
            task.id === taskId ? { ...task, status: "completed" } : task,
          ),
        );
      } else if (path.endsWith("/rate")) {
        setTasks((current) => current.filter((task) => task.id !== taskId));
      }

      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setActingId(null);
    }
  }

  function getAgent(task: TaskListItem) {
    return Array.isArray(task.agents) ? task.agents[0] : task.agent;
  }

  return (
    <div className="grid gap-4">
      {tasks.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-sm text-muted-foreground">
          {copy.noTasks}
        </div>
      ) : (
        tasks.map((task) => {
          const agent = getAgent(task);
          const form = ratingForms[task.id] ?? { rating: "5", tip: "", comment: "" };

          return (
            <article
              key={task.id}
              className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    {task.status}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {agent?.name ?? "Agent"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{agent?.tagline ?? ""}</p>
                  {task.end_reason ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      reason: {task.end_reason}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p>${Number(task.total_charge ?? 0).toFixed(2)}</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                      href={`/${locale}/tasks/${encodeURIComponent(task.id)}`}
                    >
                      {copy.open}
                    </a>
                    {tab === "active" ? (
                      <>
                        <Button
                          disabled={actingId === task.id}
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void postAction(task.id, `/api/v1/tasks/${encodeURIComponent(task.id)}/pause`)
                          }
                        >
                          {actingId === task.id ? copy.submitting : copy.pause}
                        </Button>
                        <Button
                          disabled={actingId === task.id}
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void postAction(task.id, `/api/v1/tasks/${encodeURIComponent(task.id)}/end`)
                          }
                        >
                          {actingId === task.id ? copy.submitting : copy.end}
                        </Button>
                      </>
                    ) : null}
                    {tab === "paused" ? (
                      <Button
                        disabled={actingId === task.id}
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void postAction(task.id, `/api/v1/tasks/${encodeURIComponent(task.id)}/resume`)
                        }
                      >
                        {actingId === task.id ? copy.submitting : copy.resume}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {tab === "pending" ? (
                <div className="mt-6 grid gap-3 border-t border-border/70 pt-6">
                  <input
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                    placeholder={copy.rating}
                    value={form.rating}
                    onChange={(event) =>
                      setRatingForms((current) => ({
                        ...current,
                        [task.id]: { ...form, rating: event.target.value },
                      }))
                    }
                  />
                  <input
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                    placeholder={copy.tip}
                    value={form.tip}
                    onChange={(event) =>
                      setRatingForms((current) => ({
                        ...current,
                        [task.id]: { ...form, tip: event.target.value },
                      }))
                    }
                  />
                  <textarea
                    className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                    placeholder={copy.comment}
                    value={form.comment}
                    onChange={(event) =>
                      setRatingForms((current) => ({
                        ...current,
                        [task.id]: { ...form, comment: event.target.value },
                      }))
                    }
                  />
                  <Button
                    disabled={actingId === task.id}
                    type="button"
                    onClick={() =>
                      void postAction(task.id, `/api/v1/tasks/${encodeURIComponent(task.id)}/rate`, {
                        rating: Number(form.rating) || 5,
                        tip_amount: Number(form.tip) || 0,
                        comment: form.comment,
                      })
                    }
                  >
                    {actingId === task.id ? copy.submitting : copy.saveRating}
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })
      )}

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
