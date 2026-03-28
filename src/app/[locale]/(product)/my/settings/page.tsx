import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";
import { listUserBadges } from "@/lib/badges/service";
import { getPageAccessState, requirePageUser } from "@/lib/server/page-auth";
import { getCurrentUserAccount } from "@/lib/users/profile";

type MySettingsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MySettingsPage({ params }: MySettingsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const settingsPath = `/${normalizedLocale}/my/settings`;
  const userId = await requirePageUser(normalizedLocale, settingsPath, {
    allowInactive: true,
  });
  const [profile, badges, accessState] = await Promise.all([
    getCurrentUserAccount(userId),
    listUserBadges(userId),
    getPageAccessState(),
  ]);
  const limitedForInactive =
    accessState.invitationCodeEnabled &&
    accessState.role !== "admin" &&
    !accessState.isActivated;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "设置" : "Settings"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "管理个人资料、登录方式与账户控制"
            : "Manage your profile, sign-in methods and account controls"}
        </h1>
      </section>
      <AccountSettingsPanel
        badgeCount={badges.length}
        initialProfile={profile}
        limitedForInactive={limitedForInactive}
        locale={normalizedLocale}
      />
    </main>
  );
}
