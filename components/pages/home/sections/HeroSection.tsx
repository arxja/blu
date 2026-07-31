"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useRef } from "react";
import { DashboardMockup } from "./DashboardMockup";

function HeroBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-light bg-surface/50 text-xs text-text-secondary mb-6">
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
      New: Behavioral triggers 2.0
    </div>
  );
}

function HeroActions() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button className="animate-pulse-cta inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-primary-foreground font-medium hover:scale-[1.02] transition-transform">
        Start Free Trial <ArrowRight className="w-4 h-4" />
      </button>
      <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-border text-text-primary font-medium hover:bg-muted transition">
        <PlayCircle className="w-4 h-4" /> See Demo
      </button>
    </div>
  );
}

function TrustPill() {
  return (
    <div className="mt-10 flex items-center gap-4">
      <div className="flex -space-x-2">
        {[
          "var(--chart-1)",
          "var(--chart-2)",
          "var(--chart-3)",
          "var(--chart-4)",
          "var(--chart-5)",
        ].map((color, index) => (
          <div
            key={`${color}-${index}`}
            className="w-7 h-7 rounded-full border-2 border-canvas"
            style={{ background: color }}
          />
        ))}
      </div>
      <span className="text-sm text-text-tertiary">
        Trusted by 500+ companies
      </span>
    </div>
  );
}

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const avatarsRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!heroRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(heroRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 })
      .fromTo(
        titleRef.current,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        "-=0.2",
      )
      .fromTo(
        copyRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        "-=0.45",
      )
      .fromTo(
        actionsRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.35",
      )
      .fromTo(
        avatarsRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.2",
      )
      .fromTo(
        visualRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.2",
      );
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-150 h-150 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 right-0 w-125 h-125 rounded-full bg-chart-3/10 blur-3xl" />
      </div>

      <div className="max-w-300 mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <HeroBadge />
          <h1
            ref={titleRef}
            className="text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.05] tracking-tight text-text-primary"
          >
            Turn user behavior into{" "}
            <span className="bg-linear-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              business actions
            </span>
          </h1>
          <p
            ref={copyRef}
            className="mt-6 text-lg md:text-xl text-text-secondary leading-relaxed max-w-xl"
          >
            Blu is the all-in-one B2B SaaS platform that transforms how
            companies understand and act on user behavior — in a single,
            multi-tenant system.
          </p>
          <div ref={actionsRef}>
            <HeroActions />
          </div>
          <div ref={avatarsRef}>
            <TrustPill />
          </div>
        </div>

        <div ref={visualRef}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
