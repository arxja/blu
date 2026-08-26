// todo: move these types to a separate file and import them in the files that need them

export interface NavItemsTypes {
  name: string;
  link: string;
}

export interface UserDropdownItems {
  groupName: string;
  items: NavItemsTypes[];
}

export interface FooterItemsType {
  heading: string;
  links: NavItemsTypes[];
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

export interface EmailService {
  sendPaymentSuccess(
    email: string,
    tenantName: string,
    amount: number,
  ): Promise<void>;
  sendPaymentFailed(email: string, tenantName: string): Promise<void>;
  sendTrialEnding(
    email: string,
    tenantName: string,
    endDate: Date,
  ): Promise<void>;
}
