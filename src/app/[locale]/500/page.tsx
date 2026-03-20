type FiveHundredPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function FiveHundredPage({ params }: FiveHundredPageProps) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl items-center px-6 py-12 lg:px-8">
      <section className="w-full rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">500</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {isZh ? "服务器开小差了" : "The server hit a rough patch"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {isZh
            ? "错误已被记录。你可以稍后重试，或刷新当前页面。"
            : "The error has been logged. Please retry in a moment or refresh the page."}
        </p>
      </section>
    </main>
  );
}
