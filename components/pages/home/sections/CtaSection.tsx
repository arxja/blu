"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Reveal } from "./Reveal";

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  // Todo: replace it with real handler
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (email) {
      setDone(true);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        className="flex-1 px-4 py-3 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary transition"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/30 transition"
      >
        {done ? (
          <span className="inline-flex items-center gap-1">
            <Check className="w-4 h-4" /> Sent
          </span>
        ) : (
          "Start Free Trial"
        )}
      </button>
    </form>
  );
}

export function CtaSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary">
            Ready to turn behavior into business?
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Join 500+ companies already using Blu.
          </p>
          <SignUpForm />
        </Reveal>
      </div>
    </section>
  );
}
