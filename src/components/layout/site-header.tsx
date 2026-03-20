import { useTranslations } from "next-intl";

import { HeaderNotificationLink } from "@/components/layout/header-notification-link";
import { Link } from "@/i18n/navigation";

type SiteHeaderProps = {
  locale: string;
};

export function SiteHeader({ locale }: SiteHeaderProps) {
  const t = useTranslations("common");
  const sellerDashboardLabel = locale === "zh" ? "供给后台" : "Dashboard";
  const tasksLabel = locale === "zh" ? "我的任务" : "My Tasks";
  const chineseLabel = "中文";
  const agentsLabel = locale === "zh" ? "Agent 展厅" : "Showcase";
  const leaderboardsLabel = locale === "zh" ? "排行榜" : "Leaderboard";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" locale={locale} className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
            SA
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              SummonAI
            </p>
            <p className="text-sm text-foreground/80">{t("tagline")}</p>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navigation.home")}
          </Link>
          <Link
            href="/showcase"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {agentsLabel}
          </Link>
          <Link
            href="/leaderboard"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {leaderboardsLabel}
          </Link>
          <Link
            href="/my/tasks"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tasksLabel}
          </Link>
          <Link
            href="/dashboard"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {sellerDashboardLabel}
          </Link>
          <HeaderNotificationLink locale={locale} />
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1 text-xs">
            <Link
              href="/"
              locale="en"
              className={locale === "en" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              EN
            </Link>
            <span className="text-border">/</span>
            <Link
              href="/"
              locale="zh"
              className={locale === "zh" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              {chineseLabel}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
