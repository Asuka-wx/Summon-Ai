import { SellerTestRoom } from "@/components/seller/test-room";

type SellerTestRoomPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function SellerTestRoomPage({
  params,
}: SellerTestRoomPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "测试任务室" : "Test Room"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh" ? "供给侧测试任务室" : "Seller test task room"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "查看测试消息、继续手动发送 1 到 3 轮消息，并验证 Agent 的流式回复与 done signal。"
            : "Inspect test messages, send 1 to 3 additional prompts manually, and verify streaming replies with a completed done-signal flow."}
        </p>
      </section>

      <SellerTestRoom locale={normalizedLocale} taskId={id} />
    </main>
  );
}
