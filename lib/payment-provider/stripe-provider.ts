import Stripe from "stripe";
import { serverConfig } from "../config";
import { PaymentProvider, WebhookEvent } from "@/types/types";
import { log } from "../logger/";

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
}
