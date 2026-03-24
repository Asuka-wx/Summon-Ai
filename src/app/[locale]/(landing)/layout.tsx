import "@/components/landing/landing.css";

type LandingLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LandingLayout({
  children,
  params,
}: LandingLayoutProps) {
  const { locale } = await params;
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";

  return (
    <div
      id="landing-root"
      lang={normalizedLocale}
      className="landing-root dark"
    >
      {children}
    </div>
  );
}
