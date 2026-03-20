import { Button } from "@/components/ui/button";
import { listAdminTasks } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminTasksPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    status?: string;
    start?: string;
    end?: string;
  }>;
};

export default async function AdminTasksPage({
  params,
  searchParams,
}: AdminTasksPageProps) {
  const { locale } = await params;
  const { status, start, end } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminTasks({
    page: 1,
    limit: 20,
    status,
    start,
    end,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "任务监控" : "Tasks"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "查看全平台任务状态" : "Monitor tasks across the platform"}
        </h1>
        <form className="mt-6 grid gap-4 md:grid-cols-[180px_1fr_1fr_auto]" action="">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={status ?? ""}
            name="status"
            placeholder="status"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={start ?? ""}
            name="start"
            placeholder="2026-03-01T00:00:00.000Z"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={end ?? ""}
            name="end"
            placeholder="2026-03-31T23:59:59.000Z"
          />
          <Button type="submit">{normalizedLocale === "zh" ? "筛选" : "Filter"}</Button>
        </form>
      </section>

      <section className="grid gap-4">
        {result.tasks.map((task) => (
          <a
            key={task.id}
            href={`/${normalizedLocale}/admin/tasks/${task.id}`}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5 hover:bg-accent"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {task.status} · {task.phase}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {task.id}
                </h2>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>${task.total_charge.toFixed(2)}</p>
                <p>rounds {task.round_count}</p>
              </div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
