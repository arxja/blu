"use client"

import { BarChart3, ShieldCheck, Zap } from "lucide-react";
import { Reveal } from "./Reveal";

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof BarChart3;
  title: string;
  desc: string;
}) {
  return (
    <div className="group h-full p-8 rounded-2xl bg-surface border border-border-light hover:border-primary/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all">
      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}

export function FeaturesSection() {
  const items = [
    {
      icon: BarChart3,
      title: "Behavioral Analytics",
      desc: "Real-time user behavior tracking across every touchpoint, ready to query and visualize.",
    },
    {
      icon: Zap,
      title: "Automated Actions",
      desc: "Trigger workflows, notifications, and updates from any behavioral pattern you define.",
    },
    {
      icon: ShieldCheck,
      title: "Multi-Tenant Security",
      desc: "Enterprise-grade data isolation, SSO, and audit logs built into every tenant by default.",
    },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-300 mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
              Everything you need to turn data into action
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              From behavioral insights to automated workflows — all in one
              place.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {items.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.1}>
              <FeatureCard {...feature} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
