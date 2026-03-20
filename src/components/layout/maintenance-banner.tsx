"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MaintenanceBannerProps = {
  locale: "en" | "zh";
};

type MaintenancePayload = {
  enabled?: boolean;
};

function getCopy(locale: "en" | "zh", isTaskRoom: boolean) {
  if (locale === "zh") {
    return isTaskRoom
      ? "维护进行中，当前任务不受影响。"
      : "平台维护中：新的广播与任务创建会暂时关闭。";
  }

  return isTaskRoom
    ? "Maintenance is in progress. Your current task is not affected."
    : "Maintenance mode is active. New broadcasts and tasks are temporarily disabled.";
}

export function MaintenanceBanner({ locale }: MaintenanceBannerProps) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      const payload = await fetch("/api/v1/admin/maintenance")
        .then((response) => response.json() as Promise<MaintenancePayload>)
        .catch(() => null);

      if (!mounted) {
        return;
      }

      setEnabled(Boolean(payload?.enabled));
    }

    void loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled) {
    return null;
  }

  const isTaskRoom = pathname?.includes("/tasks/") ?? false;

  return (
    <div className="border-b border-amber-300/60 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
      {getCopy(locale, isTaskRoom)}
    </div>
  );
}
