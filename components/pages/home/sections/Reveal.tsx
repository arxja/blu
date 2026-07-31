"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const node = ref.current;

      if (!node) return;

      gsap.fromTo(
        node,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay,
          ease: "power3.out",
          scrollTrigger: {
            trigger: node,
            start: "top 90%",
            once: true,
          },
        },
      );
    },
    { dependencies: [delay] },
  );

  return <div ref={ref}>{children}</div>;
}
