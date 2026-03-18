import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="relative flex min-h-screen flex-col">
        <NetworkStatusBanner message={t("networkDisconnected")} />
        <SiteHeader locale={locale} />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
