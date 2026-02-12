"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

type AppAnimationsProps = {
  children: React.ReactNode;
};

export default function AppAnimations({ children }: AppAnimationsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const items = Array.from(container.children);
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.06,
          overwrite: true,
        }
      );
    }, container);

    return () => ctx.revert();
  }, [pathname]);

  return <div ref={containerRef}>{children}</div>;
}
