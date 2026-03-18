import { getTranslations, setRequestLocale } from "next-intl/server";

import { HomePage } from "@/components/home/home-page";

type LocalePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleHomePage({ params }: LocalePageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <HomePage
      ctaLabel={t("cta")}
      ctaHref="/upload-lab"
      description={t("description")}
      eyebrow={t("eyebrow")}
      locale={locale}
      sections={[
        {
          eyebrow: t("pillars.marketplace.eyebrow"),
          title: t("pillars.marketplace.title"),
          description: t("pillars.marketplace.description"),
        },
        {
          eyebrow: t("pillars.realtime.eyebrow"),
          title: t("pillars.realtime.title"),
          description: t("pillars.realtime.description"),
        },
        {
          eyebrow: t("pillars.foundation.eyebrow"),
          title: t("pillars.foundation.title"),
          description: t("pillars.foundation.description"),
        },
      ]}
      stats={[
        t("stats.routing"),
        t("stats.supabase"),
        t("stats.relay"),
        t("stats.sentry"),
      ]}
      title={t("title")}
    />
  );
}
