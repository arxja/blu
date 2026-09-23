import mongoose from "mongoose";

import type { WebhookEvent } from "@/lib/payment-provider/types";
import { idempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import { TenantModel } from "@/lib/database/models/tenant.model";
import { PLANS, getPlanById } from "@/lib/constants";
import { log } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { getEmailService } from "@/lib/email";
import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";
import { requireMinimumRole } from "@/lib/tenancy/authorization";
import { getPaymentProvider } from "@/lib/payment-provider";

type StripeObject = Record<string, any>;

export interface CreateTenantCheckoutSessionInput {
  userId: string;
  tenantId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createTenantCheckoutSession({
  userId,
  tenantId,
  successUrl,
  cancelUrl,
}: CreateTenantCheckoutSessionInput) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw AppError.badRequest("Invalid user id.");
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw AppError.badRequest("Invalid tenant id.");
  }

  const { tenant, membership } = await authorizeTenantAccess(userId, tenantId);

  requireMinimumRole(membership.role, "admin");

  if (tenant.plan === "free") {
    throw AppError.badRequest("Free workspaces do not require payment.");
  }

  if (tenant.plan === "enterprise") {
    throw AppError.badRequest(
      "Enterprise workspaces require contacting sales.",
    );
  }

  if (tenant.status !== "pending_payment") {
    throw AppError.conflict("This workspace is not awaiting initial payment.");
  }

  const plan = getPlanById(tenant.plan);

  if (!plan.stripePriceId) {
    log.error(
      "Stripe price is not configured for tenant plan",
      new Error("Missing Stripe price ID"),
      {
        tenantId: tenant._id.toString(),
        planId: tenant.plan,
      },
    );

    throw new Error(
      `Stripe price ID is not configured for plan "${tenant.plan}".`,
    );
  }

  const provider = getPaymentProvider("stripe");

  const session = await provider.createCheckoutSession({
    tenantId: tenant._id.toString(),
    planId: tenant.plan,
    priceId: plan.stripePriceId,
    customerEmail: tenant.billingEmail,
    stripeCustomerId: tenant.stripeCustomerId,
    successUrl,
    cancelUrl,
  });

  log.info("Stripe Checkout session created", {
    tenantId: tenant._id.toString(),
    planId: tenant.plan,
    sessionId: session.id,
  });

  return session;
}

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

      case "checkout.session.async_payment_succeeded":
        await handleAsyncPaymentSucceeded(event);
        break;

      case "checkout.session.async_payment_failed":
        await handleAsyncPaymentFailed(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      default:
        log.info("Unhandled event type", {
          type: event.type,
        });
        return;
    }

    await idempotencyStore.markProcessed(event.id);
  } catch (error) {
    log.error("Failed to process webhook event", error as Error, {
      eventId: event.id,
      type: event.type,
    });

    throw error;
  }
}

/**
 * Extract a Stripe object ID from either:
 * - a string ID
 * - an expanded object containing { id }
 */
function getStripeId(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }

  return null;
}

function getTenantIdFromObject(object: StripeObject): string | null {
  const metadataTenantId = object.metadata?.tenantId;

  if (typeof metadataTenantId === "string") {
    return metadataTenantId;
  }

  const clientReferenceId = object.client_reference_id;

  if (typeof clientReferenceId === "string") {
    return clientReferenceId;
  }

  return null;
}

function getPlanIdFromPriceId(
  priceId: string | null,
): "free" | "pro" | "enterprise" | null {
  if (!priceId) {
    return null;
  }

  return PLANS.find((plan) => plan.stripePriceId === priceId)?.id ?? null;
}

function getSubscriptionPriceId(subscription: StripeObject): string | null {
  const price = subscription.items?.data?.[0]?.price;

  return getStripeId(price);
}

function getInvoiceSubscriptionId(invoice: StripeObject): string | null {
  /*
   * Keep both shapes because Stripe's Invoice representation has
   * evolved across API versions.
   */
  return (
    getStripeId(invoice.subscription) ??
    getStripeId(invoice.parent?.subscription_details?.subscription)
  );
}

async function findTenant({
  tenantId,
  subscriptionId,
  customerId,
}: {
  tenantId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  const conditions: Record<string, unknown>[] = [];

  if (tenantId) {
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      throw new AppError("Invalid tenant ID in Stripe webhook metadata.");
    }

    conditions.push({
      _id: new mongoose.Types.ObjectId(tenantId),
    });
  }

  if (subscriptionId) {
    conditions.push({
      stripeSubscriptionId: subscriptionId,
    });
  }

  if (customerId) {
    conditions.push({
      stripeCustomerId: customerId,
    });
  }

  if (conditions.length === 0) {
    return null;
  }

  return TenantModel.findOne({
    $or: conditions,
  });
}

/**
 * Prevent events from an old Stripe subscription from mutating
 * a tenant that has since moved to another subscription.
 */
function isStaleSubscriptionEvent(
  tenant: { stripeSubscriptionId?: string },
  subscriptionId: string | null,
): boolean {
  if (!tenant.stripeSubscriptionId || !subscriptionId) {
    return false;
  }

  return tenant.stripeSubscriptionId !== subscriptionId;
}

function mapStripeSubscriptionStatus(
  status: string | undefined,
): string | null {
  switch (status) {
    case "active":
      return "active";

    case "past_due":
      return "past_due";

    case "trialing":
      return "trialing";

    case "incomplete":
      return "pending_payment";

    case "incomplete_expired":
    case "canceled":
    case "unpaid":
    case "paused":
      return "suspended";

    default:
      return null;
  }
}

async function handleCheckoutCompleted(event: WebhookEvent) {
  const session = event.data as StripeObject;

  const tenantId = getTenantIdFromObject(session);

  const customerId = event.customerId ?? getStripeId(session.customer);

  const subscriptionId = getStripeId(session.subscription);

  const tenant = await findTenant({
    tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.error(
      "Tenant not found for Checkout completion",
      new Error("Tenant not found"),
      {
        eventId: event.id,
        tenantId,
        customerId,
        subscriptionId,
      },
    );

    throw new AppError("Tenant not found for checkout session.");
  }

  /*
   * The Checkout Session must belong to a paid tenant.
   * We do NOT change tenant.plan based on a browser-facing value.
   */
  if (tenant.plan === "free") {
    log.warn("Checkout completed for free tenant", {
      eventId: event.id,
      tenantId: tenant._id.toString(),
    });

    return;
  }

  if (customerId) {
    tenant.stripeCustomerId = customerId;
  }

  if (subscriptionId) {
    tenant.stripeSubscriptionId = subscriptionId;
  }

  /*
   * Checkout can be complete while payment is still processing.
   *
   * Only mark active when Stripe says the Checkout payment is paid.
   * Delayed payment methods are handled by
   * checkout.session.async_payment_succeeded.
   */
  if (session.payment_status === "paid") {
    tenant.status = "active";
  }

  await tenant.save();

  log.info("Stripe Checkout synchronized with tenant", {
    tenantId: tenant._id.toString(),
    status: tenant.status,
    subscriptionId,
    customerId,
    paymentStatus: session.payment_status,
  });
}

async function handleAsyncPaymentSucceeded(event: WebhookEvent) {
  const session = event.data as StripeObject;

  const tenantId = getTenantIdFromObject(session);

  const customerId = event.customerId ?? getStripeId(session.customer);

  const subscriptionId = getStripeId(session.subscription);

  const tenant = await findTenant({
    tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    throw new AppError("Tenant not found for async payment success.");
  }

  if (customerId) {
    tenant.stripeCustomerId = customerId;
  }

  if (subscriptionId) {
    tenant.stripeSubscriptionId = subscriptionId;
  }

  tenant.status = "active";

  await tenant.save();

  log.info("Async Stripe payment succeeded", {
    tenantId: tenant._id.toString(),
    subscriptionId,
  });
}

async function handleAsyncPaymentFailed(event: WebhookEvent) {
  const session = event.data as StripeObject;

  const tenantId = getTenantIdFromObject(session);

  const customerId = event.customerId ?? getStripeId(session.customer);

  const subscriptionId = getStripeId(session.subscription);

  const tenant = await findTenant({
    tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.warn("Tenant not found for async payment failure", {
      eventId: event.id,
      tenantId,
      customerId,
      subscriptionId,
    });

    return;
  }

  /*
   * An async initial payment failure does NOT necessarily mean
   * an already-active subscription became past_due.
   *
   * Keep a new tenant awaiting payment.
   */
  if (tenant.status === "pending_payment") {
    log.warn("Initial async payment failed", {
      tenantId: tenant._id.toString(),
      subscriptionId,
    });

    return;
  }

  log.warn("Async payment failed for tenant", {
    tenantId: tenant._id.toString(),
    status: tenant.status,
    subscriptionId,
  });
}

async function handleSubscriptionUpdated(event: WebhookEvent) {
  const subscription = event.data as StripeObject;

  const subscriptionId = getStripeId(subscription.id);

  const customerId = event.customerId ?? getStripeId(subscription.customer);

  const tenantId = getTenantIdFromObject(subscription);

  const tenant = await findTenant({
    tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.warn("Tenant not found for subscription update", {
      eventId: event.id,
      tenantId,
      customerId,
      subscriptionId,
    });

    return;
  }

  /*
   * If this event belongs to an older subscription, ignore it.
   */
  if (isStaleSubscriptionEvent(tenant, subscriptionId)) {
    log.warn("Ignoring stale Stripe subscription event", {
      eventId: event.id,
      tenantId: tenant._id.toString(),
      currentSubscriptionId: tenant.stripeSubscriptionId,
      eventSubscriptionId: subscriptionId,
    });

    return;
  }

  if (customerId) {
    tenant.stripeCustomerId = customerId;
  }

  if (subscriptionId) {
    tenant.stripeSubscriptionId = subscriptionId;
  }

  const priceId = getSubscriptionPriceId(subscription);

  const planId = getPlanIdFromPriceId(priceId);

  /*
   * A plan change is driven by the Stripe subscription's actual
   * Price, not by Checkout metadata.
   */
  if (planId && planId !== "free" && planId !== tenant.plan) {
    tenant.plan = planId;
  } else if (!planId && priceId) {
    log.error(
      "Unknown Stripe Price on subscription",
      new Error("Unknown Stripe Price"),
      {
        eventId: event.id,
        tenantId: tenant._id.toString(),
        priceId,
      },
    );
  }

  const mappedStatus = mapStripeSubscriptionStatus(subscription.status);

  if (mappedStatus) {
    tenant.status = mappedStatus as typeof tenant.status;
  }

  if (subscription.trial_end) {
    tenant.trialEndsAt = new Date(subscription.trial_end * 1000);
  } else {
    tenant.trialEndsAt = undefined;
  }

  await tenant.save();

  log.info("Subscription synchronized", {
    tenantId: tenant._id.toString(),
    subscriptionId,
    plan: tenant.plan,
    status: tenant.status,
  });
}

async function handleInvoicePaid(event: WebhookEvent) {
  const invoice = event.data as StripeObject;

  const customerId = event.customerId ?? getStripeId(invoice.customer);

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const tenant = await findTenant({
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.warn("Tenant not found for paid invoice", {
      eventId: event.id,
      customerId,
      subscriptionId,
    });

    return;
  }

  /*
   * If this invoice belongs to an old subscription,
   * never reactivate the new one.
   */
  if (isStaleSubscriptionEvent(tenant, subscriptionId)) {
    log.warn("Ignoring stale paid invoice", {
      eventId: event.id,
      tenantId: tenant._id.toString(),
      currentSubscriptionId: tenant.stripeSubscriptionId,
      invoiceSubscriptionId: subscriptionId,
    });

    return;
  }

  /*
   * If the tenant doesn't have its subscription ID yet,
   * this invoice event can establish it.
   */
  if (!tenant.stripeSubscriptionId && subscriptionId) {
    tenant.stripeSubscriptionId = subscriptionId;
  }

  if (customerId) {
    tenant.stripeCustomerId = customerId;
  }

  /*
   * For Blu's initial paid subscription this is the actual
   * successful billing signal.
   */
  if (tenant.status !== "active") {
    tenant.status = "active";
  }

  await tenant.save();

  /*
   * Email is a side effect. Its failure should not cause Stripe
   * billing synchronization to fail and be retried.
   */
  try {
    const emailService = getEmailService();

    await emailService.sendPaymentSuccess(
      tenant.billingEmail,
      tenant.companyName,
      Number(invoice.amount_paid ?? 0) / 100,
    );
  } catch (error) {
    log.error("Invoice paid but payment email failed", error as Error, {
      tenantId: tenant._id.toString(),
      eventId: event.id,
    });
  }

  log.info("Invoice paid", {
    tenantId: tenant._id.toString(),
    amount: invoice.amount_paid,
  });
}

async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const invoice = event.data as StripeObject;

  const customerId = event.customerId ?? getStripeId(invoice.customer);

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const tenant = await findTenant({
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.warn("Tenant not found for failed invoice", {
      eventId: event.id,
      customerId,
      subscriptionId,
    });

    return;
  }

  if (isStaleSubscriptionEvent(tenant, subscriptionId)) {
    log.warn("Ignoring stale failed invoice", {
      eventId: event.id,
      tenantId: tenant._id.toString(),
      currentSubscriptionId: tenant.stripeSubscriptionId,
      invoiceSubscriptionId: subscriptionId,
    });

    return;
  }

  /*
   * The first failed subscription payment can correspond to
   * Stripe's incomplete/pending state.
   *
   * Only an already-active tenant should become past_due here.
   */
  if (tenant.status === "active" || tenant.status === "past_due") {
    tenant.status = "past_due";
    await tenant.save();
  }

  try {
    const emailService = getEmailService();

    await emailService.sendPaymentFailed(
      tenant.billingEmail,
      tenant.companyName,
    );
  } catch (error) {
    log.error(
      "Invoice failed but payment-failure email failed",
      error as Error,
      {
        tenantId: tenant._id.toString(),
        eventId: event.id,
      },
    );
  }

  log.warn("Invoice payment failed", {
    tenantId: tenant._id.toString(),
    status: tenant.status,
  });
}

async function handleSubscriptionDeleted(event: WebhookEvent) {
  const subscription = event.data as StripeObject;

  const subscriptionId = getStripeId(subscription.id);

  const customerId = event.customerId ?? getStripeId(subscription.customer);

  const tenantId = getTenantIdFromObject(subscription);

  const tenant = await findTenant({
    tenantId,
    subscriptionId,
    customerId,
  });

  if (!tenant) {
    log.warn("Tenant not found for deleted subscription", {
      eventId: event.id,
      tenantId,
      customerId,
      subscriptionId,
    });

    return;
  }

  if (isStaleSubscriptionEvent(tenant, subscriptionId)) {
    log.warn("Ignoring stale deleted subscription event", {
      eventId: event.id,
      tenantId: tenant._id.toString(),
      currentSubscriptionId: tenant.stripeSubscriptionId,
      deletedSubscriptionId: subscriptionId,
    });

    return;
  }

  const previousStatus = tenant.status;

  /*
   * Do NOT downgrade the Tenant to Free automatically.
   *
   * `Tenant.plan` represents the tenant's plan, while `status`
   * represents whether that subscription currently grants access.
   *
   * This also prevents a canceled paid workspace from accidentally
   * consuming or bypassing the user's free-workspace entitlement.
   */
  tenant.status = "suspended";

  await tenant.save();

  log.info("Tenant subscription deleted", {
    tenantId: tenant._id.toString(),
    previousStatus,
    status: tenant.status,
    plan: tenant.plan,
  });
}
