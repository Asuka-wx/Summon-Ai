import { Button } from "@/components/ui/button";
import { AgentsManager } from "@/components/admin/agents-manager";
import { listAdminAgents } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminAgentsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    quality_status?: string;
  }>;
};

export default async function AdminAgentsPage({
  params,
  searchParams,
}: AdminAgentsPageProps) {
  const { locale } = await params;
  const { q, status, quality_status } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminAgents({
    page: 1,
    limit: 20,
    q,
    status,
    qualityStatus: quality_status,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "Agent 管理" : "Agents"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "审核与管理供给方 Agent" : "Review and manage live supplier agents"}
        </h1>
        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_180px_auto]" action="">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={q ?? ""}
            name="q"
            placeholder={normalizedLocale === "zh" ? "搜索名称或简介" : "Search name or tagline"}
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={status ?? ""}
            name="status"
            placeholder="status"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={quality_status ?? ""}
            name="quality_status"
            placeholder="quality"
          />
          <Button type="submit">{normalizedLocale === "zh" ? "筛选" : "Filter"}</Button>
        </form>
      </section>
      <AgentsManager locale={normalizedLocale} initialAgents={result.agents} />
    </main>
  );
}
