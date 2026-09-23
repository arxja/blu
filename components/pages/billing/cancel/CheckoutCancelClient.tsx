"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { navigateTo } from "@/components/pages/workspaces/workspace-navigation";

interface Props {
  tenantId: string | null;
}

export default function CheckoutCancelClient({ tenantId }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retryCheckout = async () => {
    if (!tenantId) {
      setError("Missing workspace information.");
      return;
    }

    setError(null);
    setIsRetrying(true);

    try {
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

      if (!result.url) {
        throw new Error("Checkout URL was not returned.");
      }

      navigateTo(result.url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 transition-colors duration-300">
      <section className="w-full max-w-md rounded-2xl border border-border-light bg-surface p-8 text-center shadow-md transition-colors duration-300">
        <AlertTriangle
          size={40}
          aria-hidden="true"
          className="mx-auto mb-5 text-warning"
        />

        <h1 className="text-2xl font-semibold text-text-primary">
          Checkout cancelled
        </h1>

        <p className="mt-3 text-sm text-text-tertiary">
          Your workspace hasn&apos;t been activated yet. Your workspace is still
          waiting for payment.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={retryCheckout}
            disabled={isRetrying || !tenantId}
            className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetrying ? "Starting checkout..." : "Continue to Checkout"}
          </button>

          <a
            href="/dashboard"
            className="rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Return to Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
