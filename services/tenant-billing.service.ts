import { WebhookEvent } from "@/types/types";
import { idempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import Tenant from "@/lib/database/models/tenant.model";
import { PLANS } from "@/lib/constants";
import { log } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export async function handleWebhookEvent(event: WebhookEvent) {
  if (await idempotencyStore.isProcessed(event.id)) {
    log.info("Duplicate event skipped", { eventId: event.id });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        log.info("Unhandled event type", { type: event.type });
        return;
    }

    await idempotencyStore.markProcessed(event.id);
  } catch (error) {
    // Pass the error as the second argument, extra context as the third
    log.error("Failed to process webhook event", error as Error, {
      eventId: event.id,
      type: event.type,
    });
    throw error; // allow queue to retry
  }
}

async function handleCheckoutCompleted(event: WebhookEvent) {
  const session = event.data;
  const customerId = event.customerId || session.customer;
  if (!customerId) {
    log.error(
      "No customer ID in checkout session",
      new Error("Missing customer ID"),
      { eventId: event.id },
    );
    throw new AppError("Missing customer ID in checkout.session.completed");
  }

  const priceId =
    session.metadata?.price_id || session.line_items?.data?.[0]?.price?.id;
  const planId =
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      ? "pro"
      : priceId === process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
        ? "enterprise"
        : null;

  if (!planId) {
    log.warn("Unknown plan in checkout session", { priceId });
    return;
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return;

  const ownerId = session.client_reference_id;
  let tenant = ownerId
    ? await Tenant.findOne({ ownerId })
    : await Tenant.findOne({ stripeCustomerId: customerId });

  if (!tenant) {
    log.error(
      "Tenant not found for checkout session",
      new Error("Tenant not found"),
      { customerId, ownerId },
    );
    return;
  }

  tenant.plan = planId;
  tenant.status = "active";
  tenant.stripeCustomerId = customerId;
  tenant.quotas = {
    monthlyEvents: plan.limits.monthlyEvents,
    retentionDays: plan.limits.dataRetentionDays,
    apiRateLimit: plan.limits.apiRateLimit,
    seats: plan.limits.seats === -1 ? 999999 : plan.limits.seats,
  };
  await tenant.save();

  log.info("Tenant upgraded via checkout", {
    tenantId: tenant._id,
    plan: planId,
  });
}

async function handleSubscriptionDeleted(event: WebhookEvent) {
  const subscription = event.data;
  const customerId = event.customerId || subscription.customer;
  if (!customerId) return;

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) return;

  const freePlan = PLANS.find((p) => p.id === "free")!;
  tenant.plan = "free";
  tenant.status = "suspended";
  tenant.quotas = {
    monthlyEvents: freePlan.limits.monthlyEvents,
    retentionDays: freePlan.limits.dataRetentionDays,
    apiRateLimit: freePlan.limits.apiRateLimit,
    seats: freePlan.limits.seats,
  };
  await tenant.save();

  log.info("Subscription cancelled, downgraded to free", {
    tenantId: tenant._id,
    previousPlan: tenant.plan,
  });
}
