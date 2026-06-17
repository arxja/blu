export interface NavItemsTypes {
  name: string;
  link: string;
}

// Webhook - Infrastructure

export interface WebhookPayload<T = any> {
  id: string;
  type: string;
  data: T;
  createdAt: string;
  provider: string;
  signature: string;
  idempotencyKey: string;
}

export interface WebhookJob {
  id: string;
  eventId: string;
  provider: string;
  eventType: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  nextRetry?: Date;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export enum WebhookEventStatus {
  RECEIVED = "received",
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}