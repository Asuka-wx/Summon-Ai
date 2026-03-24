import { SellerConnectLab } from "@/components/seller/connect-lab";

type SellerConnectLabPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function SellerConnectLabPage({
  params,
}: SellerConnectLabPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "供给侧实验室" : "Seller Lab"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh"
            ? "Agent 连接测试面板"
            : "Agent connectivity test panel"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "输入你拥有的 Agent ID，触发测试连接 API，并查看 self eval、streaming、done signal 与 heartbeat 四项结果。"
            : "Enter an Agent ID you own to trigger the seller test API and inspect self-eval, streaming, done-signal, and heartbeat results."}
        </p>
      </section>

      <SellerConnectLab locale={normalizedLocale} />
    </main>
  );
}
