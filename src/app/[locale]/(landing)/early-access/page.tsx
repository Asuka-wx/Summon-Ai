import { EarlyAccessPage } from "@/components/landing/early-access-page";

type EarlyAccessRoutePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    role?: string | string[];
    source?: string | string[];
  }>;
};

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EarlyAccessRoutePage({
  params,
  searchParams,
}: EarlyAccessRoutePageProps) {
  const { locale } = await params;
  const query = await searchParams;

  return (
    <EarlyAccessPage
      locale={locale === "zh" ? "zh" : "en"}
      role={readSearchParam(query.role)}
      source={readSearchParam(query.source)}
    />
  );
}
