import Link from "next/link";
import type { Route } from "next";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <main className="w-full max-w-2xl rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-2xl shadow-primary/10">
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            404
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
            The page you are looking for does not exist.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            We could not find that route. You can head back home or explore the live marketplace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={"/en" as Route}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Go home
            </Link>
            <Link
              href={"/en/showcase" as Route}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Open showcase
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
