"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PLANS, type Plan } from "@/lib/constants";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const Pricing = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  // Set up GSAP animations
  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Heading animation
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

      // Cards staggered animation
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

  // Helper: Format price with optional yearly discount
  const getDisplayPrice = (plan: Plan) => {
    if (plan.id === "free") return "$0";
    const monthlyPrice = plan.price.monthly;
    if (billingCycle === "yearly") {
      const yearlyPrice = monthlyPrice * 12 * 0.85; // 15% discount
      return `$${yearlyPrice.toFixed(0)}`;
    }
    return `$${monthlyPrice}`;
  };

  const getPricePeriod = (plan: Plan) => {
    if (plan.id === "free") return "";
    return billingCycle === "yearly" ? "/year" : "/month";
  };

  const getYearlySavings = (plan: Plan) => {
    if (plan.id === "free" || billingCycle === "monthly") return null;
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyTotal = monthlyTotal * 0.85;
    const savings = monthlyTotal - yearlyTotal;
    return `Save $${savings.toFixed(0)}/year`;
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen py-24 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "var(--color-canvas)",
        transition: "var(--transition-theme)",
      }}
    >
      {/* Background decorative elements */}
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
        {/* Header Section */}
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
            Understand user behavior across your entire multi-tenant
            architecture.
          </p>

          {/* Billing Toggle */}
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
              onClick={() =>
                setBillingCycle((prev) =>
                  prev === "monthly" ? "yearly" : "monthly",
                )
              }
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan: any, index: number) => {
            const isPopular = plan.badge === "Most Popular";
            const isEnterprise = plan.id === "enterprise";

            return (
              <div
                key={plan.id}
                ref={(el) => {
                  cardsRef.current[index] = el;
                }}
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
                {/* Badge */}
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
                  {/* Plan Name */}
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {plan.name}
                  </h2>

                  {/* Price */}
                  <div className="mt-4 mb-6">
                    <span
                      className="text-4xl sm:text-5xl font-bold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {getDisplayPrice(plan)}
                    </span>
                    <span
                      className="text-base ml-1"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {getPricePeriod(plan)}
                    </span>
                    {getYearlySavings(plan) && (
                      <div
                        className="text-xs mt-1 font-medium"
                        style={{ color: "var(--color-success)" }}
                      >
                        {getYearlySavings(plan)}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link
                    href={
                      isEnterprise
                        ? "mailto:sales@example.com"
                        : `${
                            process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL
                          }?plan=${plan.id}&billing=${billingCycle}`
                    }
                    className="block w-full py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor:
                        plan.id === "free"
                          ? "var(--color-surface-elevated)"
                          : "var(--color-primary-500)",
                      color:
                        plan.id === "free"
                          ? "var(--color-text-primary)"
                          : "white",
                      borderWidth: plan.id === "free" ? "1px" : "0",
                      borderColor: "var(--color-border-default)",
                    }}
                  >
                    {plan.cta}
                  </Link>

                  {/* Divider */}
                  <hr
                    className="my-6"
                    style={{ borderColor: "var(--color-border-light)" }}
                  />

                  {/* Features List */}
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

                  {/* Limit Indicators for Pro/Enterprise */}
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
                          {plan.limits.seats === -1
                            ? "Unlimited"
                            : plan.limits.seats}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p
          className="text-center text-sm mt-12"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          No credit card required for the Free plan.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
