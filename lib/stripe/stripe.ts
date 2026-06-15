import Stripe from "stripe";
import { clientConfig, serverConfig } from "../config";

export const stripe = new Stripe(serverConfig.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

// Helper to test mode
export const isStripeTestMode = () => {
  return (
    clientConfig.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ??
    false
  );
};
