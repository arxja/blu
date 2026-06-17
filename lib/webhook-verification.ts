import crypto from "crypto";
import { log } from "./logger";

interface WebhookVerifier {
  verify(rawBody: Buffer, signature: string, secret: string): boolean;
}

// Stripe verifier
class StripeVerifier implements WebhookVerifier {
  verify(rawBody: Buffer, signature: string, secret: string): boolean {
    try {
      const signatureParts = signature.split(",").reduce(
        (acc, part) => {
          const [key, value] = part.split("=");
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      const timestamp = signatureParts["t"];
      const expectedSignature = signatureParts["v1"];

      if (!timestamp || !expectedSignature) {
        log.warn("Invalid Stripe signature format", { signature });
        return false;
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTimestamp - parseInt(timestamp)) > 300) {
        log.warn("Webhook timestamp outside tolerance", {
          timestamp,
          currentTimestamp,
        });
        return false;
      }

      const signedPayload = `${timestamp}.${rawBody.toString()}`;
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      log.error("Stripe signature verification failed", error as Error);
      return false;
    }
  }
}

// Generic HMAC-SHA256 verifier (GitHub, Slack, Shopify, etc.)
class HMACVerifier implements WebhookVerifier {
  verify(rawBody: Buffer, signature: string, secret: string): boolean {
    try {
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const expectedSignature = signature.startsWith("sha256=")
        ? `sha256=${hmac}`
        : hmac;

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      log.error("HMAC verification failed", error as Error);
      return false;
    }
  }
}

// Factory to get the right verifier
function getVerifier(provider: string): WebhookVerifier {
  switch (provider.toLowerCase()) {
    case "stripe":
      return new StripeVerifier();
    case "github":
    case "slack":
    case "shopify":
      return new HMACVerifier();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Get webhook secret from environment
function getWebhookSecret(provider: string): string {
  const secretMap: Record<string, string | undefined> = {
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    github: process.env.GITHUB_WEBHOOK_SECRET,
    slack: process.env.SLACK_WEBHOOK_SECRET,
    shopify: process.env.SHOPIFY_WEBHOOK_SECRET,
  };

  const secret = secretMap[provider.toLowerCase()];
  if (!secret) {
    throw new Error(`Webhook secret not configured for ${provider}`);
  }

  return secret;
}

export async function verifyWebhook(
  rawBody: Buffer,
  provider: string,
  signature: string,
): Promise<boolean> {
  try {
    const secret = getWebhookSecret(provider);
    const verifier = getVerifier(provider);
    return verifier.verify(rawBody, signature, secret);
  } catch (error) {
    log.error("Webhook verification failed", error as Error);
    return false;
  }
}

// Helper to get signature from headers based on provider
export function getWebhookSignature(
  headers: Headers,
  provider: string,
): string | null {
  const headerMap: Record<string, string> = {
    stripe: "stripe-signature",
    github: "x-hub-signature-256",
    slack: "x-slack-signature",
    shopify: "x-shopify-hmac-sha256",
  };

  const headerName = headerMap[provider.toLowerCase()];
  if (!headerName) {
    log.warn(`No signature header mapping for provider: ${provider}`);
    return null;
  }

  return headers.get(headerName);
}
