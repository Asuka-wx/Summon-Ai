import { InvitationCodesManager } from "@/components/admin/invitation-codes-manager";
import { requirePageAdmin } from "@/lib/server/page-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitationCodesAdminPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function InvitationCodesAdminPage({
  params,
}: InvitationCodesAdminPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const supabase = createAdminClient();
  const [{ data: codes }, { count: totalCodes }, { count: totalUsed }, { count: totalActivatedUsers }, { data: batchRows }, { data: config }, { count: totalUsers }, { count: activatedUsers }] =
    await Promise.all([
      supabase
        .from("invitation_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("invitation_codes").select("id", { count: "exact", head: true }),
      supabase.from("invitation_code_usages").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("is_activated", true),
      supabase.from("invitation_codes").select("batch_name, max_uses, use_count"),
      supabase
        .from("platform_config")
        .select("value")
        .eq("key", "invitation_code_enabled")
        .maybeSingle(),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("is_activated", true),
    ]);

  const byBatch = Object.values(
    (batchRows ?? []).reduce((accumulator, row) => {
      const batchName = row.batch_name ?? "default";
      const current = accumulator[batchName] ?? {
        batch_name: batchName,
        total: 0,
        used: 0,
        remaining: 0,
      };

      current.total += 1;
      current.used += Number(row.use_count ?? 0);
      current.remaining += Math.max(Number(row.max_uses ?? 1) - Number(row.use_count ?? 0), 0);
      accumulator[batchName] = current;
      return accumulator;
    }, {} as Record<string, { batch_name: string; total: number; used: number; remaining: number }>),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "邀请码系统" : "Invitation Codes"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh" ? "管理邀请码与激活状态" : "Manage code inventory and activation state"}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "查看邀请码批次、生成新邀请码，并控制平台是否需要邀请码激活。"
            : "Review invitation batches, generate new codes and control whether account activation requires an invitation code."}
        </p>
      </section>
      <div className="mt-8">
        <InvitationCodesManager
          locale={normalizedLocale}
          initialCodes={(codes ?? []).map((code) => ({
            ...code,
            max_uses: Number(code.max_uses ?? 1),
            use_count: Number(code.use_count ?? 0),
          }))}
          initialStats={{
            total_codes: totalCodes ?? 0,
            total_used: totalUsed ?? 0,
            total_activated_users: totalActivatedUsers ?? 0,
            by_batch: byBatch,
          }}
          initialSystemStatus={{
            invitation_code_enabled: config?.value !== "false" && config?.value !== false,
            total_users: totalUsers ?? 0,
            activated_users: activatedUsers ?? 0,
            pending_users: Math.max((totalUsers ?? 0) - (activatedUsers ?? 0), 0),
          }}
        />
      </div>
    </main>
  );
}
