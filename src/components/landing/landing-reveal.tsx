"use client";

import { useEffect, useRef, useState } from "react";

type LandingRevealProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
};

export function LandingReveal({
  children,
  className,
  delayMs = 0,
}: LandingRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 600ms ease-out ${delayMs}ms, transform 600ms ease-out ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
