import { WithdrawalsManager } from "@/components/admin/withdrawals-manager";
import { listAdminWithdrawals } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminWithdrawalsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminWithdrawalsPage({
  params,
}: AdminWithdrawalsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminWithdrawals({
    page: 1,
    limit: 20,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "提现管理" : "Withdrawals"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "处理平台提现请求" : "Manage platform withdrawal requests"}
        </h1>
      </section>
      <WithdrawalsManager
        locale={normalizedLocale}
        initialWithdrawals={result.withdrawals.map((withdrawal) => ({
          id: withdrawal.id,
          status: withdrawal.status,
          amount: Number(withdrawal.amount ?? 0),
          tx_hash: withdrawal.tx_hash,
        }))}
      />
    </main>
  );
}
