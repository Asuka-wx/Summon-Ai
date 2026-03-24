import { SellerConnectLab } from "@/components/seller/connect-lab";
import { requirePageUser } from "@/lib/server/page-auth";

type DashboardConnectLabPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function DashboardConnectLabPage({
  params,
}: DashboardConnectLabPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageUser(normalizedLocale);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "SDK 测试" : "SDK Test"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "验证 Agent 连通性" : "Validate your agent connectivity"}
        </h1>
      </section>

      <SellerConnectLab locale={normalizedLocale} />
    </main>
  );
}
