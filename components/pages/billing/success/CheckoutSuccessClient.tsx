"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { navigateTo } from "@/components/pages/workspaces/workspace-navigation";
import { getWorkspaceUrl } from "../../workspaces/new/workspace-domain";

type BillingStatusResponse = {
  status: "active" | "pending_payment" | "trialing" | "past_due" | "suspended";
  plan: "free" | "pro" | "enterprise";
  subdomain: string;
};

interface Props {
  tenantId: string | null;
  sessionId: string | null;
}

const MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1000;

export default function CheckoutSuccessClient({ tenantId }: Props) {
  if (!tenantId) {
    // Debug: ensure missing-tenant branch is rendered during tests
    // eslint-disable-next-line no-console
    console.log("CheckoutSuccessClient: rendering missing-tenant UI");

    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 transition-colors duration-300">
        <section className="w-full max-w-md rounded-2xl border border-border-light bg-surface p-8 text-center shadow-md transition-colors duration-300">
          <XCircle
            size={40}
            aria-hidden="true"
            className="mx-auto mb-5 text-error"
          />

          <h1 className="text-2xl font-semibold text-text-primary">
            We couldn&apos;t confirm your payment
          </h1>

          <p className="mt-3 text-sm text-text-tertiary">
            Missing workspace information.
          </p>

          <a
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Go to Dashboard
          </a>
        </section>
      </main>
    );
  }

  const [status, setStatus] = useState<
    "loading" | "active" | "pending" | "error"
  >("loading");

  const [message, setMessage] = useState("Confirming your payment...");

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;

        try {
          const response = await fetch(
            `/api/workspaces/${tenantId}/billing/status`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Unable to verify payment status.");
          }

          const billing = result as BillingStatusResponse;

          if (billing.status === "active") {
            if (cancelled) return;

            setStatus("active");

            /*
             * Give React one render to show the confirmation state
             * before navigating to the tenant.
             */
            setTimeout(() => {
              navigateTo(getWorkspaceUrl(billing.subdomain));
            }, 500);

            return;
          }

          if (
            billing.status === "pending_payment" ||
            billing.status === "past_due"
          ) {
            if (!cancelled) {
              setStatus("pending");

              setMessage(
                billing.status === "past_due"
                  ? "Your payment needs attention."
                  : "We're confirming your payment...",
              );
            }

            await new Promise((resolve) =>
              window.setTimeout(resolve, POLL_INTERVAL_MS),
            );

            continue;
          }

          /*
           * Unexpected/restricted billing state.
           */
          throw new Error("This workspace is not in an active billing state.");
        } catch (error) {
          if (cancelled) return;

          setStatus("error");

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to verify payment status.",
          );

          return;
        }
      }

      if (!cancelled) {
        setStatus("pending");
        setMessage(
          "Payment is still being confirmed. You can return to your workspace and check Billing shortly.",
        );
      }
    };

    void checkStatus();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 transition-colors duration-300">
      <section className="w-full max-w-md rounded-2xl border border-border-light bg-surface p-8 text-center shadow-md transition-colors duration-300">
        {status === "loading" && (
          <>
            <div
              role="status"
              aria-label="Confirming payment"
              className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-border-light border-t-primary-500"
            />

            <h1 className="text-2xl font-semibold text-text-primary">
              Confirming payment
            </h1>

            <p className="mt-2 text-sm text-text-tertiary">{message}</p>
          </>
        )}

        {status === "pending" && (
          <>
            <Clock
              size={40}
              aria-hidden="true"
              className="mx-auto mb-5 text-warning"
            />

            <h1 className="text-2xl font-semibold text-text-primary">
              Payment processing
            </h1>

            <p className="mt-3 text-sm text-text-tertiary">{message}</p>

            <p className="mt-6 text-xs text-text-disabled">
              You can safely leave this page. Your billing status will be
              synchronized automatically.
            </p>
          </>
        )}

        {status === "active" && (
          <>
            <CheckCircle2
              size={40}
              aria-hidden="true"
              className="mx-auto mb-5 text-success"
            />

            <h1 className="text-2xl font-semibold text-text-primary">
              Payment confirmed
            </h1>

            <p className="mt-2 text-sm text-text-tertiary">
              Your workspace is ready.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle
              size={40}
              aria-hidden="true"
              className="mx-auto mb-5 text-error"
            />

            <h1 className="text-2xl font-semibold text-text-primary">
              We couldn&apos;t confirm your payment
            </h1>

            <p className="mt-3 text-sm text-text-tertiary">{message}</p>

            <a
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Go to Dashboard
            </a>
          </>
        )}
      </section>
    </main>
  );
}
