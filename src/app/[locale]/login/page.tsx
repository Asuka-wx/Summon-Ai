import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginPanel } from "@/components/auth/login-panel";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect-target";
import { getProductAccessState } from "@/lib/server/product-access";

type LoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const query = await searchParams;
  const defaultNextHref = `/${normalizedLocale}/app` as const;
  const nextHref = normalizeInternalRedirectTarget(query.next, defaultNextHref);
  const accessState = await getProductAccessState();

  if (accessState.isSignedIn) {
    if (accessState.requiresActivation) {
      redirect(`/${normalizedLocale}/activate?redirect=${encodeURIComponent(nextHref)}`);
    }

    redirect(nextHref);
  }

  return (
    <AuthShell locale={normalizedLocale}>
      <LoginPanel locale={normalizedLocale} nextHref={nextHref} />
    </AuthShell>
  );
}
