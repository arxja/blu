"use client";

import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

function TestimonialCard({
  quote,
  name,
  title,
  company,
}: {
  quote: string;
  name: string;
  title: string;
  company: string;
}) {
  return (
    <div className="h-full p-8 rounded-2xl bg-surface border border-border-light hover:-translate-y-1 hover:shadow-xl transition">
      <div className="flex gap-0.5 text-warning mb-4">
        {[...Array(5)].map((_, starIndex) => (
          <Star key={`${name}-${starIndex}`} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <p className="italic text-text-secondary leading-relaxed">"{quote}"</p>
      <div className="mt-6 pt-6 border-t border-border-light">
        <div className="text-sm font-semibold text-text-primary">{name}</div>
        <div className="text-xs text-text-tertiary">
          {title} · {company}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const items = [
    {
      quote:
        "Blu let us collapse three tools into one. Our activation rate jumped 34% in the first quarter.",
      name: "Ana Ribeiro",
      title: "VP Product",
      company: "Nimbus",
    },
    {
      quote:
        "The multi-tenant model is exactly what we needed. Every enterprise customer feels like they have their own instance.",
      name: "Marcus Chen",
      title: "CTO",
      company: "Vertex",
    },
    {
      quote:
        "We wire up a new behavioral trigger in minutes instead of shipping engineering tickets.",
      name: "Priya Shah",
      title: "Head of Growth",
      company: "Orbit",
    },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-300 mx-auto px-6">
        <Reveal>
          <h2 className="text-center text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
            Loved by product teams everywhere
          </h2>
        </Reveal>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {items.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.1}>
              <TestimonialCard {...testimonial} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
