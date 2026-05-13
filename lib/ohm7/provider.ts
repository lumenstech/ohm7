// WhatsApp / SMS verification + approval provider abstraction.
//
// In development (no Twilio/etc. configured), we use a "simulated" provider
// that logs the verification code to the server console and records it on the
// claim row. Production must wire a real provider — see TODO below.

import { randomInt } from "node:crypto";

export type SendVerificationInput = {
  channel: "whatsapp" | "sms";
  toPhone: string;
  code: string;
  context: string;
};

export type SendApprovalInput = {
  channel: "whatsapp" | "sms";
  toPhone: string;
  body: string;
  approveUrl: string;
  denyUrl: string;
};

export interface Provider {
  name: string;
  sendVerification(input: SendVerificationInput): Promise<void>;
  sendApprovalRequest(input: SendApprovalInput): Promise<void>;
}

class SimulatedProvider implements Provider {
  name = "simulated";
  async sendVerification(input: SendVerificationInput) {
    // eslint-disable-next-line no-console
    console.log(
      `[ohm7:simulated] ${input.channel} to ${input.toPhone} — verification code ${input.code} for ${input.context}`,
    );
  }
  async sendApprovalRequest(input: SendApprovalInput) {
    // eslint-disable-next-line no-console
    console.log(
      `[ohm7:simulated] ${input.channel} to ${input.toPhone} — approval request:\n${input.body}\n  approve: ${input.approveUrl}\n  deny:    ${input.denyUrl}`,
    );
  }
}

// TODO(prod): implement TwilioProvider that reads TWILIO_* env vars and uses
// the Twilio REST API. Surface webhook callbacks for owner approval taps.
export function getProvider(): Provider {
  // const which = process.env.WHATSAPP_PROVIDER;
  // if (which === "twilio") return new TwilioProvider();
  return new SimulatedProvider();
}

export function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000));
}
