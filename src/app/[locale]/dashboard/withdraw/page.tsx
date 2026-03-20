import { WithdrawPanel } from "@/components/seller/withdraw-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSellerWithdrawalAvailability } from "@/lib/payments/service";
import { requirePageUser } from "@/lib/server/page-auth";

type DashboardWithdrawPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function DashboardWithdrawPage({ params }: DashboardWithdrawPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const supabase = createAdminClient();
  const [availability, { data: withdrawals }] = await Promise.all([
    getSellerWithdrawalAvailability(userId),
    supabase
      .from("withdrawals")
      .select("amount, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "提现" : "Withdraw"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          ${availability.available.toFixed(2)}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? `冻结保护余额：$${availability.frozen.toFixed(2)}`
            : `Frozen for active task protection: $${availability.frozen.toFixed(2)}`}
        </p>
      </section>
      <WithdrawPanel
        locale={normalizedLocale}
        initialAvailability={availability}
        initialWithdrawals={(withdrawals ?? []).map((withdrawal) => ({
          amount: Number(withdrawal.amount ?? 0),
          status: withdrawal.status,
          created_at: withdrawal.created_at,
        }))}
      />
    </main>
  );
}
