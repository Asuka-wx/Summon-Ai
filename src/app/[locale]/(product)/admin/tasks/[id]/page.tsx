import { getAdminTaskDetail } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminTaskDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function AdminTaskDetailPage({
  params,
}: AdminTaskDetailPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const detail = await getAdminTaskDetail(id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Task</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {detail.task.id}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {detail.task.status} · {detail.task.phase}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Summary</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p>user: {detail.user?.display_name ?? "-"}</p>
            <p>agent: {detail.agent?.name ?? "-"}</p>
            <p>total: ${detail.task.total_charge.toFixed(2)}</p>
            <p>end reason: {detail.task.end_reason ?? "-"}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Messages</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {detail.messages.slice(0, 8).map((message) => (
              <div
                key={message.id}
                className="rounded-2xl border border-border/70 bg-background/75 p-4"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {message.role} · round {message.round_number}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
