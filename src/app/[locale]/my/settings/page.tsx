import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";
import { listUserBadges } from "@/lib/badges/service";
import { requirePageUser } from "@/lib/server/page-auth";
import { getCurrentUserAccount } from "@/lib/users/profile";

type MySettingsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MySettingsPage({ params }: MySettingsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const [profile, badges] = await Promise.all([
    getCurrentUserAccount(userId),
    listUserBadges(userId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "设置" : "Settings"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "管理个人资料与账户偏好"
            : "Manage your profile, notifications and account controls"}
        </h1>
      </section>
      <AccountSettingsPanel
        locale={normalizedLocale}
        initialProfile={profile}
        badgeCount={badges.length}
      />
    </main>
  );
}
