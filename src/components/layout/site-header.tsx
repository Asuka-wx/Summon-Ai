"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { SessionExitButton } from "@/components/auth/session-exit-button";
import { HeaderNotificationLink } from "@/components/layout/header-notification-link";
import { Link, usePathname } from "@/i18n/navigation";

type SiteHeaderProps = {
  locale: string;
  isSignedIn?: boolean;
  isAdmin?: boolean;
};

export function SiteHeader({
  locale,
  isSignedIn = false,
  isAdmin = false,
}: SiteHeaderProps) {
  const t = useTranslations("common");
  const currentPath = usePathname() || "/";
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const localizedPath = currentPath;
  const normalizedPath =
    currentPath === `/${locale}`
      ? "/"
      : currentPath.startsWith(`/${locale}/`)
        ? currentPath.slice(locale.length + 1)
        : currentPath;

  const navItems = [
    {
      href: "/",
      label: t("navigation.home"),
    },
    {
      href: "/app",
      label: normalizedLocale === "zh" ? "产品大堂" : "Product Hall",
    },
    {
      href: "/showcase",
      label: normalizedLocale === "zh" ? "专家广场" : "Showcase",
    },
    {
      href: "/leaderboard",
      label: normalizedLocale === "zh" ? "排行榜" : "Leaderboard",
    },
    {
      href: "/dashboard",
      label: normalizedLocale === "zh" ? "Seller 工作区" : "Dashboard",
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: normalizedLocale === "zh" ? "Admin 控制台" : "Admin",
          },
        ]
      : []),
  ] as const;

  function isActivePath(href: string) {
    if (href === "/") {
      return normalizedPath === "/";
    }

    return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" locale={locale} className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-foreground" />
          <span className="text-[15px] font-medium text-foreground">SummonAI</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-border/70 bg-card/75 p-1 shadow-lg shadow-primary/5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                locale={locale}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  isActivePath(item.href)
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <HeaderNotificationLink locale={locale} />
          {isSignedIn ? (
            <SessionExitButton
              className="h-10 rounded-full border border-border bg-card/80 px-4 text-sm text-foreground hover:bg-accent"
              locale={normalizedLocale}
              mode="switch"
            />
          ) : null}
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1 text-xs shadow-lg shadow-primary/5">
            <Link
              href={localizedPath}
              locale="en"
              className={
                locale === "en"
                  ? "rounded-full bg-background px-2 py-1 font-semibold text-foreground"
                  : "px-2 py-1 text-muted-foreground"
              }
            >
              EN
            </Link>
            <span className="text-border">/</span>
            <Link
              href={localizedPath}
              locale="zh"
              className={
                locale === "zh"
                  ? "rounded-full bg-background px-2 py-1 font-semibold text-foreground"
                  : "px-2 py-1 text-muted-foreground"
              }
            >
              中文
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
