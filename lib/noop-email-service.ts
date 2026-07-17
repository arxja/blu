import { EmailService } from "@/types/types";
import { log } from "@/lib/logger/index";

export class NoopEmailService implements EmailService {
  async sendPaymentSuccess(email: string, tenantName: string, amount: number) {
    log.info("[EMAIL NOOP] Payment success", { email, tenantName, amount });
  }
  async sendPaymentFailed(email: string, tenantName: string) {
    log.info("[EMAIL NOOP] Payment failed", { email, tenantName });
  }
  async sendTrialEnding(email: string, tenantName: string, endDate: Date) {
    log.info("[EMAIL NOOP] Trial ending soon", { email, tenantName, endDate });
  }
}
