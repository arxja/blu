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
