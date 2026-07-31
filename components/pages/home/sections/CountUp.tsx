"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

export function CountUp({
  to,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState("0");

  useGSAP(
    () => {
      const node = ref.current;

      if (!node) return;

      const obj = { value: 0 };
      gsap.to(obj, {
        value: to,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          setValue(obj.value.toFixed(decimals));
        },
        scrollTrigger: {
          trigger: node,
          start: "top 90%",
          once: true,
        },
      });
    },
    { dependencies: [to, decimals] },
  );

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}
