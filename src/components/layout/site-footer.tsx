import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("common.footer");

  return (
    <footer className="border-t border-border/60 px-6 py-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{t("left")}</p>
        <p>{t("right")}</p>
      </div>
    </footer>
  );
}
