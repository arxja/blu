"use client";

import type { UseFormReturn } from "react-hook-form";

import { PLANS } from "@/lib/constants";

import type { CreateWorkspaceFormData } from "../types";

interface Props {
  form: UseFormReturn<CreateWorkspaceFormData>;
}

export default function WorkspacePlanStep({ form }: Props) {
  const selectedPlan = form.watch("plan");

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-8 shadow-sm transition-colors duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Choose your plan
        </h1>

        <p className="mt-2 text-sm text-text-tertiary">
          Select the plan for this workspace. You can change your plan later.
        </p>
      </div>

      <div className="grid gap-4">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => form.setValue("plan", plan.id)}
              className={`relative rounded-2xl border p-6 text-left transition-colors duration-200 ${
                isSelected
                  ? "border-primary-500 bg-primary-500/10 ring-1 ring-primary-500"
                  : "border-border-light hover:border-border-heavy"
              }`}
            >
              {plan.badge && (
                <span className="absolute right-5 bottom-5 rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-white">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {plan.name}
                  </h2>

                  <p className="mt-1 text-sm text-text-tertiary">
                    {plan.id === "free" &&
                      "For getting started with core analytics."}

                    {plan.id === "pro" &&
                      "For growing teams that need advanced analytics."}

                    {plan.id === "enterprise" &&
                      "For organizations with advanced requirements."}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold text-text-primary tabular-nums">
                    ${plan.price.monthly}
                  </p>

                  {plan.price.monthly > 0 && (
                    <p className="text-xs text-text-tertiary">/ month</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-2 text-sm text-text-secondary">
                {plan.features.slice(0, 5).map((feature) => (
                  <div key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="text-primary-500">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200 ${
                    isSelected ? "border-primary-500" : "border-border-default"
                  }`}
                >
                  {isSelected && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                  )}
                </span>

                <span className="text-sm font-medium text-text-secondary">
                  {isSelected ? "Selected" : "Select this plan"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
