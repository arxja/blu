"use client";

import type { UseFormReturn } from "react-hook-form";
import { getWorkspaceBaseDomain } from "../workspace-domain";
import type { CreateWorkspaceFormData } from "../types";

interface Props {
  form: UseFormReturn<CreateWorkspaceFormData>;
}

export default function WorkspaceBasicsStep({ form }: Props) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <section className="rounded-2xl border border-border-light bg-surface p-8 shadow-sm transition-colors duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Create your workspace
        </h1>

        <p className="mt-2 text-sm text-text-tertiary">
          Start by telling us a little about your workspace.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="companyName"
            className="mb-2 block text-sm font-medium text-text-secondary"
          >
            Company name
          </label>

          <input
            id="companyName"
            {...register("companyName")}
            placeholder="Acme Inc"
            className="w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors duration-200 placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />

          {errors.companyName && (
            <p className="mt-2 text-sm text-error">
              {errors.companyName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="subdomain"
            className="mb-2 block text-sm font-medium text-text-secondary"
          >
            Workspace URL
          </label>

          <div className="flex items-center rounded-xl border border-border-default bg-surface transition-colors duration-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
            <input
              id="subdomain"
              {...register("subdomain")}
              placeholder="acme"
              className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />

            <span className="px-4 text-sm text-text-tertiary">
              .{getWorkspaceBaseDomain()}
            </span>
          </div>

          {errors.subdomain && (
            <p className="mt-2 text-sm text-error">
              {errors.subdomain.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
