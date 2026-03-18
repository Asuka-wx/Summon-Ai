"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-lg rounded-[1.75rem] border border-border bg-card p-8 shadow-xl">
          <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
            Global Error
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            Something went wrong.
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            The error has been captured for investigation. You can try rendering the route again.
          </p>
          <button
            className="mt-6 rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
