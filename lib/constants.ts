export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: { monthly: 0 },
    stripePriceId: null,
    limits: {
      monthlyTrackedUsers: 1000,
      monthlyEvents: 100000,
      dataRetentionDays: 30,
      apiRateLimit: 100,
      seats: 1,
      dashboards: 3,
      reports: 5,
    },
    features: [
      "1,000 monthly tracked users",
      "100,000 events / month",
      "30-day data retention",
      "Core analytics: funnels, retention",
      "3 dashboards",
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
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    limits: {
      monthlyTrackedUsers: 10000,
      monthlyEvents: 1000000,
      dataRetentionDays: 180,
      apiRateLimit: 1000,
      seats: 10,
      dashboards: -1,
      reports: -1,
    },
    features: [
      "10,000 monthly tracked users",
      "1,000,000 events / month",
      "6-month data retention",
      "Everything in Free, plus:",
      "Unlimited dashboards",
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
    stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    limits: {
      monthlyTrackedUsers: 100000,
      monthlyEvents: 10000000,
      dataRetentionDays: 730,
      apiRateLimit: 10000,
      seats: -1,
      dashboards: -1,
      reports: -1,
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
export const getPlanById = (id: string): Plan | undefined => {
  return PLANS_BY_ID[id as PlanId];
};

export const NAVBAR_ITEMS: NavItemsTypes[] = [
  {
    name: "Pricing",
    link: "/pricing",
  },
  {
    name: "About",
    link: "/#",
  },
  {
    name: "Contact",
    link: "/#",
  },
];
