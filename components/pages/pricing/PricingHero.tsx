"use client";

import type { RefObject } from "react";

type BillingCycle = "monthly" | "yearly";

type PricingHeroProps = {
  headingRef: RefObject<HTMLDivElement | null>;
  billingCycle: BillingCycle;
  onToggle: () => void;
};

const PricingHero = ({
  headingRef,
  billingCycle,
  onToggle,
}: PricingHeroProps) => {
  return (
    <div ref={headingRef} className="text-center mb-16">
      <h1
        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        Privacy-first{" "}
        <span style={{ color: "var(--color-primary-500)" }}>
          product analytics
        </span>{" "}
        for modern SaaS
      </h1>
      <p
        className="text-lg sm:text-xl max-w-2xl mx-auto"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Understand user behavior across your entire multi-tenant architecture.
      </p>

      <div className="mt-8 flex items-center justify-center gap-4">
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "text-primary-500"
              : "text-text-tertiary"
          }`}
          style={{
            color:
              billingCycle === "monthly"
                ? "var(--color-primary-500)"
                : "var(--color-text-tertiary)",
          }}
        >
          Monthly
        </span>
        <button
          type="button"
          aria-label="Toggle billing cycle"
          role="switch"
          aria-checked={billingCycle === "yearly"}
          onClick={onToggle}
          className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          style={{
            backgroundColor: "var(--color-primary-500)",
            transition: "var(--transition-theme)",
          }}
        >
          <span
            className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300"
            style={{
              transform:
                billingCycle === "yearly" ? "translateX(28px)" : "none",
            }}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "yearly"
              ? "text-primary-500"
              : "text-text-tertiary"
          }`}
          style={{
            color:
              billingCycle === "yearly"
                ? "var(--color-primary-500)"
                : "var(--color-text-tertiary)",
          }}
        >
          Yearly{" "}
          <span
            className="text-xs ml-1 px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: "var(--color-primary-100)",
              color: "var(--color-primary-700)",
            }}
          >
            Save 15%
          </span>
        </span>
      </div>
    </div>
  );
};

export default PricingHero;
