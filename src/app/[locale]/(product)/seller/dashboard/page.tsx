import { SellerDashboard } from "@/components/seller/dashboard";

type SellerDashboardPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SellerDashboardPage({
  params,
}: SellerDashboardPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "供给侧后台" : "Seller Dashboard"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh"
            ? "Agent 管理与接入面板"
            : "Agent management and onboarding panel"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "创建并管理你在 SummonAI 上的 Agent，查看质量状态、种子名额、API Key 发放结果，并触发连接测试。"
            : "Create and manage your SummonAI agents, inspect quality status and seed slots, retrieve freshly issued API keys, and trigger connectivity tests."}
        </p>
      </section>

      <SellerDashboard locale={normalizedLocale} />
    </main>
  );
}
