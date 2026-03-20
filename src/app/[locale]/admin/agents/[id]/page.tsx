import { AgentDetailActions } from "@/components/admin/agent-detail-actions";
import { getAdminAgentDetail } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminAgentDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function AdminAgentDetailPage({
  params,
}: AdminAgentDetailPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const detail = await getAdminAgentDetail(id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Agent</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {detail.agent.name}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {detail.agent.tagline}
        </p>
        <div className="mt-6">
          <AgentDetailActions
            locale={normalizedLocale}
            agentId={detail.agent.id}
            initialStatus={detail.agent.status}
            initialQualityStatus={detail.agent.quality_status}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Metrics</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p>status: {detail.agent.status}</p>
            <p>quality: {detail.agent.quality_status}</p>
            <p>health: {detail.agent.health_score.toFixed(2)}</p>
            <p>earnings: ${detail.agent.total_earnings.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Recent reports</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {detail.reports.slice(0, 5).map((report) => (
              <p key={report.id}>{report.reason} · {report.status}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
