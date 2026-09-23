"use client";

import type { UseFormReturn } from "react-hook-form";

import type { CreateWorkspaceFormData } from "../types";

interface Props {
  form: UseFormReturn<CreateWorkspaceFormData>;
}

export default function WorkspaceConfigStep({ form }: Props) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-8 shadow-sm transition-colors duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Workspace configuration
        </h1>

        <p className="mt-2 text-sm text-text-tertiary">
          Configure the workspace owner and billing contact.
        </p>
      </div>

      <div>
        <label
          htmlFor="billingEmail"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          Billing email
        </label>

        <input
          id="billingEmail"
          type="email"
          {...register("billingEmail")}
          placeholder="billing@acme.com"
          className="w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />

        {errors.billingEmail && (
          <p className="mt-2 text-sm text-error">
            {errors.billingEmail.message}
          </p>
        )}
      </div>
    </section>
  );
}
