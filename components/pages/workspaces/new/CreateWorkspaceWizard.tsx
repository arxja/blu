"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createWorkspaceSchema } from "@/lib/validations/workspace";

import type { CreateWorkspaceFormData } from "./types";

import { getWorkspaceBaseDomain } from "./workspace-domain";
import WorkspaceBasicsStep from "./steps/WorkspaceBasicsStep";
import WorkspacePlanStep from "./steps/WorkspacePlanStep";
import WorkspaceConfigStep from "./steps/WorkspaceConfigStep";
import WorkspaceReviewStep from "./steps/WorkspaceReviewStep";

const TOTAL_STEPS = 4;

const getStepFieldNames = (
  currentStep: number,
): (keyof CreateWorkspaceFormData)[] => {
  switch (currentStep) {
    case 1:
      return ["companyName", "subdomain"];

    case 2:
      return ["billingEmail"];

    case 3:
      return ["plan"];

    default:
      return [];
  }
};

export default function CreateWorkspaceWizard() {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema) as unknown as Resolver<
      CreateWorkspaceFormData,
      any
    >,

    defaultValues: {
      companyName: "",
      subdomain: "",
      billingEmail: "",
      logo: "",
      plan: "free",
    },
  });

  const nextStep = async () => {
    setSubmitError(null);

    const valid = await form.trigger(getStepFieldNames(step));

    if (!valid) {
      return;
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  const previousStep = () => {
    setSubmitError(null);

    setStep((current) => Math.max(current - 1, 1));
  };

  const submit = form.handleSubmit(async (data) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create workspace.");
      }

      const subdomain = result.workspace.subdomain;

      window.location.href = `${window.location.protocol}//${subdomain}.${getWorkspaceBaseDomain()}`;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">
          Step {step} of {TOTAL_STEPS}
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      {step === 1 && <WorkspaceBasicsStep form={form} />}

      {step === 2 && <WorkspaceConfigStep form={form} />}

      {step === 3 && <WorkspacePlanStep form={form} />}

      {step === 4 && <WorkspaceReviewStep form={form} />}

      {submitError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={previousStep}
          disabled={step === 1 || isSubmitting}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={isSubmitting}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Workspace"}
          </button>
        )}
      </div>
    </div>
  );
}
