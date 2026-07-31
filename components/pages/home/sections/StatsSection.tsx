"use client";

import { DashboardMockup } from "./DashboardMockup";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

function StatCard({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold text-text-primary tabular-nums">
        <CountUp to={value} suffix={suffix} decimals={decimals} />
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-24 bg-surface-elevated/50 border-y border-border-light">
      <div className="max-w-300 mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              See Blu in action
            </h2>
            <p className="mt-4 text-text-secondary leading-relaxed">
              Teams using Blu ship personalized experiences faster, retain more
              customers, and trust their data end-to-end.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              <StatCard value={87} suffix="%" label="Retention lift" />
              <StatCard
                value={2.5}
                suffix="×"
                label="Faster delivery"
                decimals={1}
              />
              <StatCard
                value={99.9}
                suffix="%"
                label="Uptime SLA"
                decimals={1}
              />
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <DashboardMockup />
        </Reveal>
      </div>
    </section>
  );
}
