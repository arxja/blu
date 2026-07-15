import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment-provider";
import { queue } from "@/lib/queue/in-memory";
import { handleWebhookEvent } from "@/services/tenant-billing.service";
import { log } from "@/lib/logger";

// Must disable body parsing to get raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    // 1. Get raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      log.security("Missing Stripe signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 2. Verify signature
    const provider = getPaymentProvider("stripe");
    if (!provider.verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse event
    const event = provider.parseEvent(rawBody);

    // 4. Enqueue processing
    try {
      await queue.enqueue({ id: event.id, event }, async (job) => {
        await handleWebhookEvent(job.event);
      });
    } catch (enqueueError) {
      log.error("Failed to enqueue webhook", enqueueError as Error);
      return NextResponse.json(
        { error: "Failed to queue webhook processing" },
        { status: 500 },
      );
    }

    log.info("Webhook accepted", { eventId: event.id, type: event.type });

    // 5. Return 202 immediately
    return NextResponse.json({ received: true }, { status: 202 });
  } catch (error) {
    log.error("Webhook route error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    log.perf("Webhook handler duration", Date.now() - start);
  }
}
