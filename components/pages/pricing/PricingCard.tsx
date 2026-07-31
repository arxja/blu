"use client";

import Link from "next/link";
import type { Plan } from "@/lib/constants";

type BillingCycle = "monthly" | "yearly";

type PricingCardProps = {
  plan: Plan;
  billingCycle: BillingCycle;
  checkoutBaseUrl?: string;
  cardRef: (el: HTMLDivElement | null) => void;
};

const PricingCard = ({
  plan,
  billingCycle,
  checkoutBaseUrl,
  cardRef,
}: PricingCardProps) => {
  const isPopular = plan.badge === "Most Popular";
  const isEnterprise = plan.id === "enterprise";

  const getDisplayPrice = () => {
    if (plan.id === "free") return "$0";
    const monthlyPrice = plan.price.monthly;
    if (billingCycle === "yearly") {
      const yearlyPrice = monthlyPrice * 12 * 0.85;
      return `$${yearlyPrice.toFixed(0)}`;
    }
    return `$${monthlyPrice}`;
  };

  const getPricePeriod = () => {
    if (plan.id === "free") return "";
    return billingCycle === "yearly" ? "/year" : "/month";
  };

  const getYearlySavings = () => {
    if (plan.id === "free" || billingCycle === "monthly") return null;
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyTotal = monthlyTotal * 0.85;
    const savings = monthlyTotal - yearlyTotal;
    return `Save $${savings.toFixed(0)}/year`;
  };

  const href = isEnterprise
    ? "mailto:sales@example.com"
    : checkoutBaseUrl
      ? `${checkoutBaseUrl}?plan=${plan.id}&billing=${billingCycle}`
      : "/contact-sales";

  return (
    <div
      ref={(el) => cardRef(el)}
      className="relative rounded-2xl transition-all duration-300 hover:-translate-y-2"
      style={{
        backgroundColor: "var(--color-card)",
        borderWidth: isPopular ? "2px" : "1px",
        borderColor: isPopular
          ? "var(--color-primary-500)"
          : "var(--color-border-light)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{
            backgroundColor: "var(--color-primary-500)",
            color: "white",
          }}
        >
          {plan.badge}
        </div>
      )}

      <div className="p-6 sm:p-8">
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          {plan.name}
        </h2>

        <div className="mt-4 mb-6">
          <span
            className="text-4xl sm:text-5xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {getDisplayPrice()}
          </span>
          <span
            className="text-base ml-1"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {getPricePeriod()}
          </span>
          {getYearlySavings() && (
            <div
              className="text-xs mt-1 font-medium"
              style={{ color: "var(--color-success)" }}
            >
              {getYearlySavings()}
            </div>
          )}
        </div>

        <Link
          href={href}
          className="block w-full py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor:
              plan.id === "free"
                ? "var(--color-surface-elevated)"
                : "var(--color-primary-500)",
            color: plan.id === "free" ? "var(--color-text-primary)" : "white",
            borderWidth: plan.id === "free" ? "1px" : "0",
            borderColor: "var(--color-border-default)",
          }}
        >
          {plan.cta}
        </Link>

        <hr
          className="my-6"
          style={{ borderColor: "var(--color-border-light)" }}
        />

        <ul className="space-y-3">
          {plan.features.map((feature: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <svg
                className="w-5 h-5 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--color-primary-500)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span style={{ color: "var(--color-text-secondary)" }}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {plan.id !== "free" && (
          <div
            className="mt-6 pt-4 border-t"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--color-text-tertiary)" }}>
                API Rate Limit
              </span>
              <span
                style={{ color: "var(--color-text-secondary)" }}
                className="font-mono"
              >
                {plan.limits.apiRateLimit.toLocaleString()} req/min
              </span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--color-text-tertiary)" }}>
                Data Retention
              </span>
              <span
                style={{ color: "var(--color-text-secondary)" }}
                className="font-mono"
              >
                {plan.limits.dataRetentionDays} days
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--color-text-tertiary)" }}>
                Team Seats
              </span>
              <span
                style={{ color: "var(--color-text-secondary)" }}
                className="font-mono"
              >
                {plan.limits.seats === -1 ? "Unlimited" : plan.limits.seats}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingCard;
