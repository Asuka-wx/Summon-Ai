import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageUser } from "@/lib/server/page-auth";
import { getSellerDashboard } from "@/lib/seller/dashboard";

type DashboardEarningsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function DashboardEarningsPage({ params }: DashboardEarningsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const supabase = createAdminClient();
  const [dashboard, { data: withdrawals }] = await Promise.all([
    getSellerDashboard(userId),
    supabase
      .from("withdrawals")
      .select("amount, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "收益明细" : "Earnings"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          ${dashboard.summary.total_earnings.toFixed(2)}
        </h1>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {normalizedLocale === "zh" ? "Agent 收入概览" : "Agent revenue summary"}
          </h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {dashboard.agents.map((agent) => (
              <p key={agent.id}>
                {agent.name}: ${(Number(agent.total_earnings ?? 0) + Number(agent.total_tips ?? 0)).toFixed(2)}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {normalizedLocale === "zh" ? "最近提现" : "Recent withdrawals"}
          </h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {(withdrawals ?? []).map((withdrawal, index) => (
              <p key={`${withdrawal.created_at}-${index}`}>
                ${Number(withdrawal.amount ?? 0).toFixed(2)} · {withdrawal.status}
              </p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
