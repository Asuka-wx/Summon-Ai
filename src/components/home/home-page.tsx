import NextLink from "next/link";

import { Link } from "@/i18n/navigation";

type HomeSection = {
  eyebrow: string;
  title: string;
  description: string;
};

type HomePageProps = {
  locale: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  stats: string[];
  sections: HomeSection[];
};

export function HomePage({
  locale,
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  stats,
  sections,
}: HomePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12 lg:px-8">
      <section className="grid gap-10 rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10 backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            {eyebrow}
          </p>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-foreground sm:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              locale={locale}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5"
            >
              {ctaLabel}
            </Link>
            <NextLink
              href="/api/v1/health"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background/70 px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              /api/v1/health
            </NextLink>
          </div>
        </div>

        <div className="grid gap-4">
          {stats.map((stat) => (
            <div
              key={stat}
              className="rounded-3xl border border-border/70 bg-background/75 p-5 text-sm leading-6 text-muted-foreground"
            >
              {stat}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {section.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
