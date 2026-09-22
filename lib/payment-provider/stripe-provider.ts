import Stripe from "stripe";
import { serverConfig } from "../config";
import { log } from "../logger/";
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  PaymentProvider,
  WebhookEvent,
} from "./types";

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(serverConfig.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
    });
  }

  verifySignature(rawBody: string, signature: string): boolean {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        serverConfig.STRIPE_WEBHOOK_SECRET!,
      );

      return !!event;
    } catch (err) {
      log.security("Invalid Stripe signature", {
        error: (err as Error).message,
      });

      return false;
    }
  }

  parseEvent(rawBody: string): WebhookEvent {
    const stripeEvent = JSON.parse(rawBody);

    let customerId: string | null = null;

    if (stripeEvent.data?.object?.customer) {
      customerId = stripeEvent.data.object.customer;
    } else if (stripeEvent.data?.object?.customer_id) {
      customerId = stripeEvent.data.object.customer_id;
    }

    return {
      id: stripeEvent.id,
      type: stripeEvent.type,
      data: stripeEvent.data.object,
      customerId,
      provider: "stripe",
    };
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",

      line_items: [
        {
          price: input.priceId,
          quantity: 1,
        },
      ],

      ...(input.stripeCustomerId
        ? {
            customer: input.stripeCustomerId,
          }
        : {
            customer_email: input.customerEmail,
          }),

      client_reference_id: input.tenantId,

      metadata: {
        tenantId: input.tenantId,
        planId: input.planId,
      },

      subscription_data: {
        metadata: {
          tenantId: input.tenantId,
          planId: input.planId,
        },
      },

      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout session did not return a URL.");
    }

    return {
      id: session.id,
      url: session.url,
    };
  }
}
