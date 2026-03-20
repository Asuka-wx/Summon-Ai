import { Button } from "@/components/ui/button";
import { listAdminTransactions } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminTransactionsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    type?: string;
    status?: string;
  }>;
};

export default async function AdminTransactionsPage({
  params,
  searchParams,
}: AdminTransactionsPageProps) {
  const { locale } = await params;
  const { type, status } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminTransactions({
    page: 1,
    limit: 20,
    type,
    status,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "交易记录" : "Transactions"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "查看充值、扣费与提现流水"
            : "Inspect deposits, charges and withdrawals"}
        </h1>
        <form className="mt-6 grid gap-4 md:grid-cols-[200px_200px_auto]" action="">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={type ?? ""}
            name="type"
            placeholder="type"
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={status ?? ""}
            name="status"
            placeholder="status"
          />
          <Button type="submit">{normalizedLocale === "zh" ? "筛选" : "Filter"}</Button>
        </form>
      </section>

      <section className="grid gap-4">
        {result.transactions.map((transaction) => (
          <article
            key={`${transaction.kind}-${transaction.id}`}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {transaction.kind} · {transaction.type}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {transaction.id}
                </h2>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {transaction.tx_hash ?? "-"}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>${transaction.amount.toFixed(2)}</p>
                <p>{transaction.status}</p>
                {"task_id" in transaction && transaction.task_id ? (
                  <a
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    href={`/${normalizedLocale}/admin/tasks/${transaction.task_id}`}
                  >
                    Open task
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
