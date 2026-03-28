"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type ActivationGuardProps = {
  isActivated: boolean | null;
  isAdmin: boolean;
  requiresActivation: boolean;
  locale: "en" | "zh";
  children: React.ReactNode;
};

export function ActivationGuard({
  isActivated,
  isAdmin,
  requiresActivation,
  locale,
  children,
}: ActivationGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isWhitelistedPath =
    pathname === `/${locale}` ||
    pathname === `/${locale}/app` ||
    pathname === `/${locale}/activate` ||
    pathname.startsWith(`/${locale}/activate/`) ||
    pathname === `/${locale}/my/settings` ||
    pathname.startsWith(`/${locale}/my/settings/`) ||
    pathname === `/${locale}/agents` ||
    pathname.startsWith(`/${locale}/agents/`) ||
    pathname === `/${locale}/waitlist` ||
    pathname.startsWith(`/${locale}/waitlist/`);

  useEffect(() => {
    if (!isAdmin && requiresActivation && isActivated === false && !isWhitelistedPath) {
      router.replace(`/${locale}/activate?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isActivated, isAdmin, isWhitelistedPath, locale, pathname, requiresActivation, router]);

  if (!isAdmin && requiresActivation && isActivated === false && !isWhitelistedPath) {
    return null;
  }

  return <>{children}</>;
}
