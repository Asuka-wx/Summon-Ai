import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePageUser } from "@/lib/server/page-auth";

type MyNotificationsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MyNotificationsPage({ params }: MyNotificationsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const supabase = createAdminClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "通知中心" : "Notifications"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "集中查看平台提醒"
            : "Review platform alerts and updates in one place"}
        </h1>
      </section>
      {(notifications ?? []).length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-sm text-muted-foreground">
          {normalizedLocale === "zh" ? "当前没有通知。" : "There are no notifications yet."}
        </div>
      ) : (
        <NotificationsCenter locale={normalizedLocale} initialNotifications={notifications ?? []} />
      )}
    </main>
  );
}
