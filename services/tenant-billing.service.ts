import { WebhookEvent } from "@/types/types";
import { idempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import Tenant from "@/lib/database/models/tenant.model";
import { getPlanById, PLANS } from "@/lib/constants";
import { log } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { serverConfig } from "@/lib/config";
import { getEmailService } from "@/lib/email";

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
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event);
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
    throw error; // queue will retry with backoff, then dead-letter
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
    throw new AppError("Tenant not found for checkout session");
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
  if (!customerId) {
    log.warn("Missing customer ID in subscription deleted event", {
      eventId: event.id,
    });
    return;
  }

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) {
    log.warn("Tenant not found for subscription deleted", {
      customerId,
      eventId: event.id,
    });
    return;
  }

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

async function handleSubscriptionUpdated(event: WebhookEvent) {
  const subscription = event.data;
  const customerId = event.customerId || subscription.customer;
  if (!customerId) {
    log.warn("Missing customer ID in subscription updated event", {
      eventId: event.id,
    });
    return;
  }

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) {
    log.warn("Missing Tenant in subscription updated event", {
      customerId,
      eventId: event.id,
    });
    return;
  }

  // Update Stripe subscription ID
  tenant.stripeSubscriptionId = subscription.id;

  // Update plan if items changed (e.g, upgrade/downgrade)
  const priceId = subscription.items?.data?.[0]?.price.id;

  if (priceId) {
    const planId =
      priceId === serverConfig.STRIPE_PRO_MONTHLY_PRICE_ID
        ? "pro"
        : priceId === serverConfig.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
          ? "enterprise"
          : null;
    if (planId && planId !== tenant.plan) {
      const plan = getPlanById(planId);
      if (plan) {
        tenant.plan = planId;
        tenant.quotas = {
          monthlyEvents: plan.limits.monthlyEvents,
          retentionDays: plan.limits.dataRetentionDays,
          apiRateLimit: plan.limits.apiRateLimit,
          seats: plan.limits.seats === -1 ? 999999 : plan.limits.seats,
        };
      }
    }
  }

  // Map Stripe subscription status to our status
  switch (subscription.status) {
    case "active":
      tenant.status = "active";
      break;
    case "past_due":
      tenant.status = "past_due";
      break;
    case "suspended":
      tenant.status = "suspended";
      break;
    case "trialing":
      tenant.status = "trialing";
      break;
  }
  // Update trial end
  if (subscription.trial_end) {
    tenant.trialEndsAt = new Date(subscription.trial_end * 1000);
  }

  await tenant.save();
  log.info("Subscription updated", {
    tenantId: tenant._id,
    status: tenant.status,
  });
}

async function handleInvoicePaid(event: WebhookEvent) {
  const invoice = event.data;
  const customerId = event.customerId || invoice.customer;
  if (!customerId) {
    log.warn("Missing customer ID in Invoice Paid event", {
      eventId: event.id,
    });
    return;
  }

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) {
    log.warn("Missing Tenant in Invoice Paid event", {
      customerId,
      eventId: event.id,
    });
    return;
  }

  // Ensure status is active (might have been past_due)
  if (tenant.status !== "active") {
    tenant.status = "active";
    await tenant.save();
  }

  // Send receipt
  const emailService = getEmailService();
  await emailService.sendPaymentSuccess(
    tenant.billingEmail,
    tenant.companyName,
    invoice.amount_paid / 100, // cents to dollars
  );

  log.info("Invoice paid", {
    tenantId: tenant._id,
    amount: invoice.amount_paid,
  });
}
async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const invoice = event.data;
  const customerId = event.customerId || invoice.customer;
  if (!customerId) {
    log.warn("Missing customer ID in Invoice Paid event", {
      eventId: event.id,
    });
    return;
  }

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) {
    log.warn("Missing Tenant in Invoice Paid event", {
      customerId,
      eventId: event.id,
    });
    return;
  }

  tenant.status = "past_due";
  await tenant.save();

  // Notify
  const emailService = getEmailService();
  await emailService.sendPaymentFailed(tenant.billingEmail, tenant.companyName);

  log.warn("Invoice payment failed", { tenantId: tenant._id });
}
async function handleTrialWillEnd(event: WebhookEvent) {
  const subscription = event.data;
  const customerId = event.customerId || subscription.customer;
  if (!customerId) {
    log.warn("Missing customer ID in subscription updated event", {
      eventId: event.id,
    });
    return;
  }

  const tenant = await Tenant.findOne({ stripeCustomerId: customerId });
  if (!tenant) {
    log.warn("Missing Tenant in subscription updated event", {
      customerId,
      eventId: event.id,
    });
    return;
  }
  if (subscription.trial_end) {
    const trialEndDate = new Date(subscription.trial_end * 1000);
    const emailService = getEmailService();
    await emailService.sendTrialEnding(
      tenant.billingEmail,
      tenant.companyName,
      trialEndDate,
    );
  }
}
