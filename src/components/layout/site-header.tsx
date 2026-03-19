import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type SiteHeaderProps = {
  locale: string;
};

export function SiteHeader({ locale }: SiteHeaderProps) {
  const t = useTranslations("common");
  const sellerDashboardLabel = locale === "zh" ? "供给侧后台" : "Seller";
  const chineseLabel = "中文";
  const agentsLabel = locale === "zh" ? "Agent 广场" : "Agents";
  const leaderboardsLabel = locale === "zh" ? "排行榜" : "Leaderboards";

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
            href="/upload-lab"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navigation.uploadLab")}
          </Link>
          <Link
            href="/agents"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {agentsLabel}
          </Link>
          <Link
            href="/leaderboards"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {leaderboardsLabel}
          </Link>
          <Link
            href="/seller/dashboard"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {sellerDashboardLabel}
          </Link>
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
