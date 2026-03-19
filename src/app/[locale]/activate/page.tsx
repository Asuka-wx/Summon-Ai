import { Suspense } from "react";

import { ActivateForm } from "@/components/activation/activate-form";

type ActivatePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ActivatePage({ params }: ActivatePageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center px-6 py-12 lg:px-8">
      <section className="w-full rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Closed Beta
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh"
            ? "输入激活码以进入 SummonAI"
            : "Enter an invitation code to access SummonAI"}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "你已完成注册，但当前平台仍处于 Closed Beta 阶段。输入有效激活码后即可访问核心功能。"
            : "You have signed in successfully, but the platform is still in closed beta. Enter a valid invitation code to unlock access."}
        </p>
        <Suspense fallback={null}>
          <ActivateForm locale={normalizedLocale} />
        </Suspense>
      </section>
    </main>
  );
}
