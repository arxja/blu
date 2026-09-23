// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifySignature: vi.fn(),
  parseEvent: vi.fn(),
  enqueue: vi.fn(),
  handleWebhookEvent: vi.fn(),
  logSecurity: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
  logPerf: vi.fn(),
}));

vi.mock("@/lib/payment-provider", () => ({
  getPaymentProvider: vi.fn(() => ({
    verifySignature: mocks.verifySignature,
    parseEvent: mocks.parseEvent,
  })),
}));

vi.mock("@/lib/queue/in-memory", () => ({
  queue: {
    enqueue: mocks.enqueue,
  },
}));

vi.mock("@/services/tenant-billing.service", () => ({
  handleWebhookEvent: mocks.handleWebhookEvent,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    security: mocks.logSecurity,
    info: mocks.logInfo,
    error: mocks.logError,
    perf: mocks.logPerf,
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const stripeEvent = {
  id: "evt_test_123",
  type: "invoice.paid",
  provider: "stripe",
  customerId: "cus_test_123",
  data: {
    customer: "cus_test_123",
    subscription: "sub_test_123",
  },
};

function createRequest(
  body = '{"id":"evt_test_123"}',
  signature = "t=123,v1=test",
): NextRequest {
  return new Request("http://app.blu.test:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body,
  }) as unknown as NextRequest;
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.verifySignature.mockReturnValue(true);
    mocks.parseEvent.mockReturnValue(stripeEvent);

    /*
     * Simulate the in-memory queue actually executing its worker.
     *
     * This verifies that the route passes the parsed event into
     * the billing handler, while still keeping Stripe itself mocked.
     */
    mocks.enqueue.mockImplementation(
      async (
        job: { id: string; event: typeof stripeEvent },
        worker: (job: {
          id: string;
          event: typeof stripeEvent;
        }) => Promise<void>,
      ) => {
        await worker(job);
      },
    );

    mocks.handleWebhookEvent.mockResolvedValue(undefined);
  });

  it("rejects requests without a Stripe signature", async () => {
    const request = new Request(
      "http://app.blu.test:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: '{"id":"evt_test_123"}',
      },
    ) as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      error: "Missing signature",
    });

    expect(mocks.verifySignature).not.toHaveBeenCalled();
    expect(mocks.parseEvent).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid Stripe signature", async () => {
    mocks.verifySignature.mockReturnValue(false);

    const response = await POST(createRequest());

    expect(response.status).toBe(401);

    expect(await response.json()).toEqual({
      error: "Invalid signature",
    });

    expect(mocks.verifySignature).toHaveBeenCalledWith(
      '{"id":"evt_test_123"}',
      "t=123,v1=test",
    );

    expect(mocks.parseEvent).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("accepts a valid Stripe webhook", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(202);

    expect(await response.json()).toEqual({
      received: true,
    });

    expect(mocks.verifySignature).toHaveBeenCalledWith(
      '{"id":"evt_test_123"}',
      "t=123,v1=test",
    );

    expect(mocks.parseEvent).toHaveBeenCalledWith('{"id":"evt_test_123"}');

    expect(mocks.enqueue).toHaveBeenCalledOnce();

    expect(mocks.handleWebhookEvent).toHaveBeenCalledWith(stripeEvent);
  });

  it("queues the parsed event using its Stripe event ID", async () => {
    await POST(createRequest());

    const [job] = mocks.enqueue.mock.calls[0];

    expect(job).toEqual({
      id: "evt_test_123",
      event: stripeEvent,
    });
  });

  it("returns 500 when webhook queueing fails", async () => {
    mocks.enqueue.mockRejectedValue(new Error("Queue unavailable"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);

    expect(await response.json()).toEqual({
      error: "Failed to queue webhook processing",
    });

    expect(mocks.handleWebhookEvent).not.toHaveBeenCalled();
  });

  it("returns 500 when event parsing fails", async () => {
    mocks.parseEvent.mockImplementation(() => {
      throw new Error("Invalid event payload");
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(500);

    expect(await response.json()).toEqual({
      error: "Internal server error",
    });

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("returns 500 when an unexpected route error occurs", async () => {
    mocks.verifySignature.mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(500);

    expect(await response.json()).toEqual({
      error: "Internal server error",
    });

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("does not process the webhook before signature verification", async () => {
    mocks.verifySignature.mockReturnValue(false);

    await POST(createRequest());

    expect(mocks.parseEvent).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.handleWebhookEvent).not.toHaveBeenCalled();
  });
});
