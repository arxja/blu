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
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Choose your plan</h1>

        <p className="mt-2 text-sm text-slate-500">
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
              className={`relative rounded-2xl border p-6 text-left transition ${
                isSelected
                  ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              {plan.badge && (
                <span className="absolute right-5 bottom-5 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {plan.id === "free" &&
                      "For getting started with core analytics."}

                    {plan.id === "pro" &&
                      "For growing teams that need advanced analytics."}

                    {plan.id === "enterprise" &&
                      "For organizations with advanced requirements."}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold">
                    ${plan.price.monthly}
                  </p>

                  {plan.price.monthly > 0 && (
                    <p className="text-xs text-slate-500">/ month</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-2 text-sm text-slate-600">
                {plan.features.slice(0, 5).map((feature) => (
                  <div key={feature} className="flex gap-2">
                    <span aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected ? "border-slate-900" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  )}
                </span>

                <span className="text-sm font-medium">
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
