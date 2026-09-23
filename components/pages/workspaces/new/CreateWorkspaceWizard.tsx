"use client";

import { useState } from "react";
import { Resolver, useForm } from "react-hook-form";
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
      return ["plan"];

    case 3:
      return ["billingEmail"];

    default:
      return [];
  }
};

type WorkspaceResponse = {
  workspace: {
    id?: string;
    _id?: string;
    subdomain: string;
  };
};

function getWorkspaceId(workspace: WorkspaceResponse["workspace"]) {
  return workspace.id ?? workspace._id ?? null;
}

/* Shared button recipes — keep the wizard visually consistent with the system */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const primaryButton = `rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

const secondaryButton = `rounded-xl border border-border-default bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

export default function CreateWorkspaceWizard() {
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * If a Pro tenant was successfully created but Checkout failed,
   * remember that tenant so the user can retry Checkout without
   * creating another workspace.
   */
  const [pendingPaymentTenantId, setPendingPaymentTenantId] = useState<
    string | null
  >(null);

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

  const startCheckout = async (tenantId: string) => {
    const response = await fetch(
      `/api/workspaces/${tenantId}/billing/checkout`,
      {
        method: "POST",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to start checkout.");
    }

    if (!result.url || typeof result.url !== "string") {
      throw new Error("Checkout URL was not returned.");
    }

    /*
     * Stripe is now taking over navigation.
     */
    window.location.href = result.url;
  };

  const submit = form.handleSubmit(async (data) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      /*
       * Enterprise does not currently have a self-service billing flow.
       * Keep it out of the workspace creation path.
       */
      if (data.plan === "enterprise") {
        throw new Error("Enterprise workspaces require contacting sales.");
      }

      /*
       * Retry Checkout for a tenant that was already created.
       *
       * This is important if:
       *   Tenant creation succeeded
       *   but Stripe was temporarily unavailable.
       */
      if (data.plan === "pro" && pendingPaymentTenantId) {
        await startCheckout(pendingPaymentTenantId);
        return;
      }

      /*
       * First create the actual Tenant.
       */
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as WorkspaceResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to create workspace.");
      }

      const workspaceId = getWorkspaceId(result.workspace);

      if (!workspaceId) {
        throw new Error(
          "Workspace was created but its identifier was not returned.",
        );
      }

      /*
       * Free workspace:
       * creation is complete, so go directly to the tenant.
       */
      if (data.plan === "free") {
        const subdomain = result.workspace.subdomain;

        window.location.href = `${window.location.protocol}//${subdomain}.${getWorkspaceBaseDomain()}`;

        return;
      }

      /*
       * Pro workspace:
       * the tenant was intentionally created as pending_payment.
       * Immediately start Stripe Checkout.
       */
      if (data.plan === "pro") {
        setPendingPaymentTenantId(workspaceId);

        await startCheckout(workspaceId);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to complete workspace setup.",
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const selectedPlan = form.watch("plan");

  const submitLabel =
    selectedPlan === "pro"
      ? "Start Pro"
      : selectedPlan === "enterprise"
        ? "Contact Sales"
        : "Create Workspace";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-tertiary tabular-nums">
          Step {step} of {TOTAL_STEPS}
        </p>

        <div
          role="progressbar"
          aria-label="Workspace setup progress"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          className="mt-3 h-2 overflow-hidden rounded-full bg-border-light"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      {step === 1 && <WorkspaceBasicsStep form={form} />}

      {step === 2 && <WorkspacePlanStep form={form} />}

      {step === 3 && <WorkspaceConfigStep form={form} />}

      {step === 4 && <WorkspaceReviewStep form={form} />}

      {submitError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-error/30 bg-error/10 p-4"
        >
          <p className="text-sm text-error">{submitError}</p>

          {pendingPaymentTenantId && selectedPlan === "pro" && (
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                setIsSubmitting(true);

                startCheckout(pendingPaymentTenantId)
                  .catch((error) => {
                    setSubmitError(
                      error instanceof Error
                        ? error.message
                        : "Unable to start checkout.",
                    );
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              disabled={isSubmitting}
              className={`mt-4 ${primaryButton}`}
            >
              {isSubmitting ? "Starting checkout..." : "Retry Checkout"}
            </button>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <button
          type="button"
          onClick={previousStep}
          disabled={step === 1 || isSubmitting}
          className={secondaryButton}
        >
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={isSubmitting}
            className={primaryButton}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting || selectedPlan === "enterprise"}
            className={primaryButton}
          >
            {isSubmitting ? "Processing..." : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
