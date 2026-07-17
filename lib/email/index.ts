import { EmailService } from "@/types/types";
import { NoopEmailService } from "../noop-email-service";
// import { SmtpEmailService } from './smtp-email-service'; // to be built later

export function getEmailService(): EmailService {
  // if (serverConfig.SENDING_EMAILS === "true") {
    // return new SmtpEmailService();
  //   throw new Error("Real email service not implemented yet");
  // }
  return new NoopEmailService();
}
