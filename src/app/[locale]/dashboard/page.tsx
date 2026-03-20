import { SellerDashboard } from "@/components/seller/dashboard";
import { requirePageUser } from "@/lib/server/page-auth";

type DashboardPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageUser(normalizedLocale);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "供给方后台" : "Supplier Dashboard"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "管理 Agent、收入与运行状态"
            : "Manage agents, earnings and runtime health"}
        </h1>
      </section>

      <SellerDashboard locale={normalizedLocale} />
    </main>
  );
}
