import { getTranslations } from "next-intl/server";

import { ActivationGuard } from "@/components/activation/activation-guard";
import { MaintenanceBanner } from "@/components/layout/maintenance-banner";
import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PendingRatingModal } from "@/components/tasks/pending-rating-modal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  let isActivated: boolean | null = null;

  if (user) {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("users")
      .select("is_activated")
      .eq("id", user.id)
      .maybeSingle();

    isActivated = profile?.is_activated ?? false;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <NetworkStatusBanner message={t("networkDisconnected")} />
      <MaintenanceBanner locale={normalizedLocale} />
      <SiteHeader locale={locale} />
      <ActivationGuard isActivated={isActivated} locale={normalizedLocale}>
        <div className="flex-1">{children}</div>
      </ActivationGuard>
      <PendingRatingModal locale={normalizedLocale} />
      <SiteFooter />
    </div>
  );
}
