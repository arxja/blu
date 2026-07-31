"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Activity, TrendingUp, Users } from "lucide-react";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

function Donut() {
  const R = 22;
  const C = 2 * Math.PI * R;
  const segments = [
    { percent: 0.5, color: "var(--chart-3)" },
    { percent: 0.3, color: "var(--chart-4)" },
    { percent: 0.2, color: "var(--chart-5)" },
  ];
  let acc = 0;

  return (
    <svg viewBox="0 0 60 60" className="w-20 h-20 -rotate-90">
      <circle
        cx="30"
        cy="30"
        r={R}
        fill="none"
        stroke="var(--border-light)"
        strokeWidth="7"
      />
      {segments.map((segment, index) => {
        const dash = segment.percent * C;
        const offset = -acc * C;
        acc += segment.percent;
        return (
          <circle
            key={`${segment.color}-${index}`}
            cx="30"
            cy="30"
            r={R}
            fill="none"
            stroke={segment.color}
            strokeWidth="7"
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={offset}
            style={{ opacity: 1 }}
          />
        );
      })}
    </svg>
  );
}

export function DashboardMockup() {
  const linePoints = [40, 55, 48, 62, 58, 72, 68, 82, 78, 90, 88, 96];
  const max = 100;
  const path = linePoints
    .map((value, index) => {
      const x = (index / (linePoints.length - 1)) * 100;
      const y = 100 - (value / max) * 80 - 10;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  const bars = [45, 68, 52, 78, 62, 85, 72];

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeLeftRef = useRef<HTMLDivElement>(null);
  const badgeRightRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);

  useGSAP(() => {
    if (!containerRef.current || !cardRef.current || !lineRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const entryTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 90%",
        once: true,
      },
    });

    entryTimeline.fromTo(
      cardRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    );

    if (badgeLeftRef.current) {
      entryTimeline.fromTo(
        badgeLeftRef.current,
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" },
        "-=0.4",
      );
    }

    if (badgeRightRef.current) {
      entryTimeline.fromTo(
        badgeRightRef.current,
        { opacity: 0, x: 12 },
        { opacity: 1, x: 0, duration: 0.55, ease: "power3.out" },
        "-=0.3",
      );
    }

    if (!reduceMotion) {
      gsap.to(cardRef.current, {
        y: -4,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      if (badgeLeftRef.current) {
        gsap.to(badgeLeftRef.current, {
          y: -3,
          duration: 3.1,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 0.1,
        });
      }

      if (badgeRightRef.current) {
        gsap.to(badgeRightRef.current, {
          y: -4,
          duration: 3.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 0.2,
        });
      }
    }

    gsap.fromTo(
      lineRef.current,
      { strokeDasharray: 500, strokeDashoffset: 500, opacity: 0 },
      {
        strokeDasharray: 500,
        strokeDashoffset: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 90%",
          once: true,
        },
      },
    );

    if (areaRef.current) {
      gsap.fromTo(
        areaRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 90%",
            once: true,
          },
        },
      );
    }

    barRefs.current.forEach((bar, index) => {
      if (!bar) return;
      gsap.fromTo(
        bar,
        { height: 0, opacity: 0 },
        {
          height: `${bars[index]}%`,
          opacity: 1,
          duration: 0.7,
          delay: index * 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 90%",
            once: true,
          },
        },
      );
    });
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute -inset-20 -z-10 opacity-70 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary-400),transparent_60%)] opacity-30" />
      </div>

      <div
        ref={cardRef}
        className="glass-card gradient-border rounded-[24px] border border-white/15 bg-white/75 p-5 md:p-6 w-full shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4 text-xs">
            {["Overview", "Analytics", "Users"].map((label, index) => (
              <span
                key={label}
                className={
                  index === 0
                    ? "text-text-primary font-semibold border-b-2 border-primary pb-1"
                    : "text-text-tertiary"
                }
              >
                {label}
              </span>
            ))}
          </div>
          <div className="text-[11px] px-2 py-1 rounded-md bg-muted text-text-secondary">
            Last 30 days
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              label: "Total Users",
              value: "48,231",
              icon: Users,
              delta: "+12.4%",
            },
            {
              label: "Active Sessions",
              value: "3,842",
              icon: Activity,
              delta: "+8.1%",
            },
            {
              label: "Conversion",
              value: "6.72%",
              icon: TrendingUp,
              delta: "+2.3%",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-surface-elevated border border-border-light p-3"
            >
              <div className="flex items-center justify-between">
                <item.icon className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  {item.delta}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold tabular-nums text-text-primary">
                {item.value}
              </div>
              <div className="text-[10px] text-text-tertiary">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-surface-elevated border border-border-light p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-primary">
              User engagement
            </span>
            <span className="text-[10px] text-text-tertiary">Weekly</span>
          </div>
          <svg
            viewBox="0 0 100 60"
            className="w-full h-24"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path ref={areaRef} d={area} fill="url(#lineGrad)" opacity="0" />
            <path
              ref={lineRef}
              d={path}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0"
            />
          </svg>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 rounded-xl bg-surface-elevated border border-border-light p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-primary">
                Cohort conversion
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {bars.map((height, index) => (
                <div
                  key={`${height}-${index}`}
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  className="flex-1 rounded-t"
                  style={{ height: 0, background: "var(--chart-2)" }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 rounded-xl bg-surface-elevated border border-border-light p-3 flex flex-col items-center justify-center">
            <Donut />
            <div className="mt-2 flex flex-col gap-1 text-[10px] w-full">
              {[
                { color: "var(--chart-3)", label: "Web" },
                { color: "var(--chart-4)", label: "Mobile" },
                { color: "var(--chart-5)", label: "API" },
              ].map((segment) => (
                <div
                  key={segment.label}
                  className="flex items-center gap-1.5 text-text-tertiary"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: segment.color }}
                  />
                  {segment.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={badgeLeftRef}
        className="absolute -left-4 md:-left-8 top-1/3 glass-card rounded-xl px-3 py-2 text-xs font-semibold text-text-primary shadow-lg"
      >
        <span className="text-success">87%</span> retention
      </div>
      <div
        ref={badgeRightRef}
        className="absolute -right-4 md:-right-6 bottom-16 glass-card rounded-xl px-3 py-2 text-xs font-semibold text-text-primary shadow-lg"
      >
        <span className="text-primary">2.5×</span> faster
      </div>
    </div>
  );
}
