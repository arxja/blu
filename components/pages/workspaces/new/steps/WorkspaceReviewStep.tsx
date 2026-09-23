"use client";

import type { UseFormReturn } from "react-hook-form";

import { createWorkspaceSchema } from "@/lib/validations/workspace";
import { getPlanById } from "@/lib/constants";

import { getWorkspaceBaseDomain } from "../workspace-domain";
import type { CreateWorkspaceFormData } from "../types";

interface Props {
  form: UseFormReturn<CreateWorkspaceFormData>;
}

export default function WorkspaceReviewStep({ form }: Props) {
  const values = createWorkspaceSchema.parse(form.getValues());
  const plan = getPlanById(values.plan);

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-8 shadow-sm transition-colors duration-300">
      <h1 className="text-2xl font-semibold text-text-primary">
        Review workspace
      </h1>

      <p className="mt-2 text-sm text-text-tertiary">
        Make sure everything looks correct before creating the workspace.
      </p>

      <dl className="mt-8 divide-y divide-border-light">
        <div className="flex justify-between py-4">
          <dt className="text-sm text-text-tertiary">Company</dt>

          <dd className="text-sm font-medium text-text-primary">
            {values.companyName}
          </dd>
        </div>

        <div className="flex justify-between py-4">
          <dt className="text-sm text-text-tertiary">Workspace URL</dt>

          <dd className="text-sm font-medium text-text-primary">
            {values.subdomain}.{getWorkspaceBaseDomain()}
          </dd>
        </div>

        <div className="flex justify-between py-4">
          <dt className="text-sm text-text-tertiary">Plan</dt>

          <dd className="text-sm font-medium text-text-primary">
            {plan?.name ?? values.plan}
          </dd>
        </div>

        <div className="flex justify-between py-4">
          <dt className="text-sm text-text-tertiary">Billing</dt>

          <dd className="text-sm font-medium text-text-primary tabular-nums">
            ${plan?.price.monthly ?? 0}/month
          </dd>
        </div>

        <div className="flex justify-between py-4">
          <dt className="text-sm text-text-tertiary">Billing email</dt>

          <dd className="text-sm font-medium text-text-primary">
            {values.billingEmail}
          </dd>
        </div>
      </dl>
    </section>
  );
}
