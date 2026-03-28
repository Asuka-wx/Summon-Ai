import { getTranslations } from "next-intl/server";

import { ActivationGuard } from "@/components/activation/activation-guard";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PendingRatingModal } from "@/components/tasks/pending-rating-modal";
import { getProductAccessState } from "@/lib/server/product-access";

type ProductLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { locale } = await params;
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const t = await getTranslations({ locale, namespace: "common" });
  const accessState = await getProductAccessState();

  return (
    <div className="relative flex min-h-screen flex-col">
      <NetworkStatusBanner message={t("networkDisconnected")} />
      <MaintenanceBanner locale={normalizedLocale} />
      <SiteHeader
        isAdmin={accessState.isAdmin}
        isSignedIn={accessState.isSignedIn}
        locale={locale}
      />
      <ActivationGuard
        isActivated={accessState.isActivated}
        isAdmin={accessState.isAdmin}
        requiresActivation={accessState.requiresActivation}
        locale={normalizedLocale}
      >
        <div className="flex-1">{children}</div>
      </ActivationGuard>
      <PendingRatingModal locale={normalizedLocale} />
      <SiteFooter />
    </div>
  );
}
