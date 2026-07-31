"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Plan } from "@/lib/constants";
import PricingContent from "./PricingContent";
import PricingHero from "./PricingHero";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type BillingCycle = "monthly" | "yearly";

type PricingShellProps = {
  plans: Plan[];
  checkoutBaseUrl?: string;
};

const PricingShell = ({ plans, checkoutBaseUrl }: PricingShellProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );

      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { opacity: 0, y: 60, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            delay: index * 0.15,
            ease: "back.out(0.4)",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen py-24 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "var(--color-canvas)",
        transition: "var(--transition-theme)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 -left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: "var(--color-primary-500)" }}
        />
        <div
          className="absolute bottom-0 -right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: "var(--color-primary-400)" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <PricingHero
          headingRef={headingRef}
          billingCycle={billingCycle}
          onToggle={() =>
            setBillingCycle((prev) =>
              prev === "monthly" ? "yearly" : "monthly",
            )
          }
        />
        <PricingContent
          plans={plans}
          billingCycle={billingCycle}
          checkoutBaseUrl={checkoutBaseUrl}
          cardsRef={cardsRef}
        />
      </div>
    </section>
  );
};

export default PricingShell;
