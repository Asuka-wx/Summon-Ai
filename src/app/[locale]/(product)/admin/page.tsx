import { getAdminDashboard } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const dashboard = await getAdminDashboard({ period: "today" });
  const links = [
    ["users", "Users"],
    ["agents", "Agents"],
    ["tasks", "Tasks"],
    ["transactions", "Transactions"],
    ["withdrawals", "Withdrawals"],
    ["audit-logs", "Audit Logs"],
    ["reports", "Reports"],
    ["alerts", "Alerts"],
    ["categories", "Categories"],
    ["config", "Config"],
    ["export", "Export"],
    ["invitation-codes", "Invitation Codes"],
    ["system", "System"],
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "管理后台" : "Admin Console"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "平台运行总览" : "Platform health at a glance"}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">users</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard.users.total}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">agents</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard.agents.total}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">tasks</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard.tasks.total}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">gas</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{dashboard.system.gas.level}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map(([href, label]) => (
          <a
            key={href}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5 hover:bg-accent"
            href={`/${normalizedLocale}/admin/${href}`}
          >
            <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{label}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {normalizedLocale === "zh" ? "打开对应的管理视图" : "Open the matching admin view"}
            </p>
          </a>
        ))}
      </section>
    </main>
  );
}
