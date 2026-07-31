"use client";

import type { RefObject } from "react";
import type { Plan } from "@/lib/constants";
import PricingCard from "./PricingCard";

type BillingCycle = "monthly" | "yearly";

type PricingContentProps = {
  plans: Plan[];
  billingCycle: BillingCycle;
  checkoutBaseUrl?: string;
  cardsRef: RefObject<(HTMLDivElement | null)[]>;
};

const PricingContent = ({
  plans,
  billingCycle,
  checkoutBaseUrl,
  cardsRef,
}: PricingContentProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            checkoutBaseUrl={checkoutBaseUrl}
            cardRef={(el) => {
              const currentRefs = cardsRef.current ?? [];
              currentRefs[index] = el;
              cardsRef.current = currentRefs;
            }}
          />
        ))}
      </div>

      <p
        className="text-center text-sm mt-12"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        No credit card required for the Free plan.
      </p>
    </>
  );
};

export default PricingContent;
