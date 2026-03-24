import { LandingPage } from "@/components/landing/landing-page";

type LandingRoutePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LandingRoutePage({
  params,
}: LandingRoutePageProps) {
  const { locale } = await params;

  return <LandingPage locale={locale === "zh" ? "zh" : "en"} />;
}
