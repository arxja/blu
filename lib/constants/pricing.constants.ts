import { clientConfig } from "../config/config-client";

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0 },
    stripePriceId: null,
    limits: {
      monthlyTrackedUsers: 1_000,
      monthlyEvents: 100_000,
      dataRetentionDays: 30,
      seats: 1,
      reports: 5,
      dashboardRequestsPerMinPerUser: 100,
      dashboardRequestsPerMinPerTenant: 100, // 1 seat → same as per-user
      ingestionEventsPerSec: 50,
      ingestionBurstEvents: 500, // 10× sustained,
    },
    features: [
      "1,000 monthly tracked users",
      "100,000 events / month",
      "30-day data retention",
      "Core analytics: funnels, retention",
      "5 reports",
      "Community support",
    ],
    cta: "Get Started",
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: 49 },
    stripePriceId: clientConfig.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    limits: {
      monthlyTrackedUsers: 10_000,
      monthlyEvents: 1_000_000,
      dataRetentionDays: 180,
      seats: 10,
      reports: -1,
      dashboardRequestsPerMinPerUser: 300,
      dashboardRequestsPerMinPerTenant: 3_000, // 10 seats × 300 × 1.5 headroom
      ingestionEventsPerSec: 500,
      ingestionBurstEvents: 5_000,
    },
    features: [
      "10,000 monthly tracked users",
      "1,000,000 events / month",
      "6-month data retention",
      "Everything in Free, plus:",
      "Advanced analytics: user flows, cohorts",
      "Email support within 24h",
      "API access",
      "10 team seats",
    ],
    cta: "Start Pro Trial",
    badge: "Most Popular",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: 499 },
    stripePriceId: clientConfig.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    limits: {
      monthlyTrackedUsers: 100_000,
      monthlyEvents: 10_000_000,
      dataRetentionDays: 730,
      seats: -1, // unlimited
      reports: -1,
      dashboardRequestsPerMinPerUser: 1_000,
      dashboardRequestsPerMinPerTenant: 30_000, // absolute cap, not seat-derived
      ingestionEventsPerSec: 5_000,
      ingestionBurstEvents: 50_000,
    },
    features: [
      "100,000+ monthly tracked users",
      "10,000,000+ events / month",
      "2-year data retention",
      "Everything in Pro, plus:",
      "Custom reports & SQL queries",
      "SSO / SAML authentication",
      "SLA guarantee (99.9% uptime)",
      "Priority support (4h response)",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    badge: "Best Value",
  },
] as const;

// Type helpers
export type Plan = (typeof PLANS)[number];
export type PlanId = Plan["id"];

// O(1) lookup map
export const PLANS_BY_ID = PLANS.reduce(
  (acc, plan) => {
    acc[plan.id as PlanId] = plan;
    return acc;
  },
  {} as Record<PlanId, Plan>,
);

// Lookup function
export const getPlanById = (id: string): Plan => {
  const plan = PLANS_BY_ID[id as PlanId];
  if (!plan) {
    throw new Error(`Unknown plan id: ${id}`);
  }
  return plan;
};
