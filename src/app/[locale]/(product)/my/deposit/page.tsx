import { DepositPanel } from "@/components/payments/deposit-panel";
import { getUserBalanceSummary } from "@/lib/payments/service";
import { requirePageUser } from "@/lib/server/page-auth";

type MyDepositPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MyDepositPage({ params }: MyDepositPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const summary = await getUserBalanceSummary(userId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "充值" : "Deposit"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "向账户充值 USDC" : "Top up your balance with USDC"}
        </h1>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {normalizedLocale === "zh" ? "当前余额" : "Current balance"}
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            ${summary.balance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {normalizedLocale === "zh" ? "充值流程" : "Deposit flow"}
          </p>
          <ol className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
            <li>1. {normalizedLocale === "zh" ? "使用钱包向平台地址转入 Base USDC。" : "Send Base USDC from your wallet to the platform address."}</li>
            <li>2. {normalizedLocale === "zh" ? "提交交易哈希，系统会查询确认状态。" : "Submit the transaction hash so the app can track chain confirmation."}</li>
            <li>3. {normalizedLocale === "zh" ? "确认成功后即可回到任务室继续使用。" : "Return to your task flow after the deposit is confirmed."}</li>
          </ol>
        </div>
      </section>

      <DepositPanel
        currentBalance={summary.balance}
        depositAddress={process.env.NEXT_PUBLIC_PLATFORM_DEPOSIT_ADDRESS ?? null}
        locale={normalizedLocale}
      />
    </main>
  );
}
