export interface NavItemsTypes {
  name: string;
  link: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  customerId: string | null;
  provider: string;
}

export interface PaymentProvider {
  verifySignature(rawBody: string, signature: string): boolean;
  parseEvent(rawBody: string): WebhookEvent;
}

export interface QueueJob {
  id: string;
  event: WebhookEvent;
}

export interface QueueAdapter {
  enqueue(job: QueueJob, handler: (job: QueueJob) => Promise<void>): void;
}
