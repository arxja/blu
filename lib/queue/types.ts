import type { WebhookEvent } from "@/lib/payment-provider/types";

export interface QueueJob {
  id: string;
  event: WebhookEvent;
}

export interface QueueAdapter {
  enqueue(job: QueueJob, handler: (job: QueueJob) => Promise<void>): void;
}
