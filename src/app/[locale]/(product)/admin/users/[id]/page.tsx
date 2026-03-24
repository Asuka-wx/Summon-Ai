import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { getAdminUserDetail } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminUserDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const detail = await getAdminUserDetail(id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">User</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {detail.user.display_name}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {detail.user.email ?? "-"}
        </p>
        <div className="mt-6">
          <UserDetailActions
            locale={normalizedLocale}
            userId={detail.user.id}
            initialFrozen={Boolean(detail.user.is_frozen)}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Profile</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p>role: {detail.user.role}</p>
            <p>locale: {detail.user.locale}</p>
            <p>frozen: {detail.user.is_frozen ? "yes" : "no"}</p>
            <p>balance: ${detail.balance.balance.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Reports</h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            {detail.reports.slice(0, 5).map((report) => (
              <p key={report.id}>{report.reason} · {report.status}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
