"use client";

import { useEffect, useState } from "react";

type NetworkStatusBannerProps = {
  message: string;
};

export function NetworkStatusBanner({ message }: NetworkStatusBannerProps) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const updateOnline = () => setOnline(window.navigator.onLine);

    updateOnline();

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="border-b border-amber-300/60 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
      {message}
    </div>
  );
}
