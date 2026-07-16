import { PaymentProvider } from "@/types/types";
import { StripeProvider } from "./stripe-provider";

let stripeInstance: PaymentProvider | null = null;

export function getPaymentProvider(provider: string): PaymentProvider {
  switch (provider) {
    case "stripe":
      if (!stripeInstance) stripeInstance = new StripeProvider();
      return stripeInstance;
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
