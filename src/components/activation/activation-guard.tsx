"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type ActivationGuardProps = {
  isActivated: boolean | null;
  locale: "en" | "zh";
  children: React.ReactNode;
};

export function ActivationGuard({
  isActivated,
  locale,
  children,
}: ActivationGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isWhitelistedPath =
    pathname === `/${locale}` ||
    pathname === `/${locale}/activate` ||
    pathname.startsWith(`/${locale}/activate/`) ||
    pathname === `/${locale}/agents` ||
    pathname.startsWith(`/${locale}/agents/`) ||
    pathname === `/${locale}/waitlist` ||
    pathname.startsWith(`/${locale}/waitlist/`);

  useEffect(() => {
    if (isActivated === false && !isWhitelistedPath) {
      router.replace(`/${locale}/activate?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isActivated, isWhitelistedPath, locale, pathname, router]);

  if (isActivated === false && !isWhitelistedPath) {
    return null;
  }

  return <>{children}</>;
}
