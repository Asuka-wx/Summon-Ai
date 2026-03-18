import { getTranslations, setRequestLocale } from "next-intl/server";

import { ErrorDemoCard } from "@/components/errors/error-demo-card";
import { AvatarUploadLab } from "@/components/upload/avatar-upload-lab";

type UploadLabPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function UploadLabPage({ params }: UploadLabPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "uploadLab" });

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.03em]">{t("title")}</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <AvatarUploadLab locale={locale as "en" | "zh"} />
      <ErrorDemoCard locale={locale as "en" | "zh"} />
    </section>
  );
}
