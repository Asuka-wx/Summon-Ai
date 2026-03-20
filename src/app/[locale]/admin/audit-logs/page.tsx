import { Button } from "@/components/ui/button";
import { listAdminAuditLogs } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminAuditLogsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    event_type?: string;
    user_id?: string;
    task_id?: string;
  }>;
};

export default async function AdminAuditLogsPage({
  params,
  searchParams,
}: AdminAuditLogsPageProps) {
  const { locale } = await params;
  const { event_type, user_id, task_id } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminAuditLogs({
    page: 1,
    limit: 20,
    eventType: event_type,
    userId: user_id,
    taskId: task_id,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "审计日志" : "Audit Logs"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "查看管理与资金相关操作记录"
            : "Inspect administrative and financial events"}
        </h1>
        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]" action="">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={event_type ?? ""}
            name="event_type"
            placeholder="event_type"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={user_id ?? ""}
            name="user_id"
            placeholder="user_id"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={task_id ?? ""}
            name="task_id"
            placeholder="task_id"
          />
          <Button type="submit">{normalizedLocale === "zh" ? "筛选" : "Filter"}</Button>
        </form>
      </section>

      <section className="grid gap-4">
        {result.logs.map((log) => (
          <article
            key={log.id}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {log.event_type}
            </p>
            <pre className="mt-3 overflow-x-auto text-sm text-muted-foreground">
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </pre>
          </article>
        ))}
      </section>
    </main>
  );
}
