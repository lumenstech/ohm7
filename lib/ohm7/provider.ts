// WhatsApp / SMS verification + approval provider abstraction.
//
// Provider selection is explicit via OHM7_MESSAGE_PROVIDER. The simulated
// provider is for local dev only — it is *not* a silent production default.
// In production it throws at boot unless the operator opts in via
// OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true.

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
  /** True when the provider can actually deliver messages right now. */
  isLive(): boolean;
  sendVerification(input: SendVerificationInput): Promise<void>;
  sendApprovalRequest(input: SendApprovalInput): Promise<void>;
}

export type ProviderMode = "simulated" | "twilio" | "sequencenow" | "disabled";

export type ProviderEnv = {
  NODE_ENV?: string;
  OHM7_MESSAGE_PROVIDER?: string;
  OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  TWILIO_SMS_FROM?: string;
  SEQUENCENOW_WEBHOOK_URL?: string;
  SEQUENCENOW_API_KEY?: string;
};

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderMisconfiguredError";
  }
}

function resolveMode(env: ProviderEnv): ProviderMode {
  const raw = (env.OHM7_MESSAGE_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "simulated" || raw === "twilio" || raw === "sequencenow" || raw === "disabled") {
    return raw;
  }
  // No explicit setting → simulated only in dev/test. In production we
  // intentionally do NOT silently fall back.
  if (env.NODE_ENV === "production") {
    throw new ProviderMisconfiguredError(
      "OHM7_MESSAGE_PROVIDER is not set. Configure 'twilio', 'sequencenow', or 'disabled' in production.",
    );
  }
  return "simulated";
}

export class SimulatedProvider implements Provider {
  name = "simulated";
  isLive() { return true; }
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

export class DisabledProvider implements Provider {
  name = "disabled";
  isLive() { return false; }
  async sendVerification(_input: SendVerificationInput): Promise<void> {
    throw new ProviderUnavailableError(
      "Messaging is disabled by configuration. Verification cannot be sent.",
    );
  }
  async sendApprovalRequest(_input: SendApprovalInput): Promise<void> {
    throw new ProviderUnavailableError(
      "Messaging is disabled by configuration. Approval requests cannot be sent.",
    );
  }
}

/**
 * Safe stub for Twilio. We do NOT fake success — when the credentials are
 * missing we throw a clear ProviderMisconfiguredError. The actual REST call
 * is left as a single-place TODO so the production wiring is unambiguous.
 */
export class TwilioProvider implements Provider {
  name = "twilio";
  private accountSid: string;
  private authToken: string;
  private whatsappFrom?: string;
  private smsFrom?: string;

  constructor(env: ProviderEnv) {
    const missing: string[] = [];
    if (!env.TWILIO_ACCOUNT_SID) missing.push("TWILIO_ACCOUNT_SID");
    if (!env.TWILIO_AUTH_TOKEN) missing.push("TWILIO_AUTH_TOKEN");
    if (!env.TWILIO_WHATSAPP_FROM && !env.TWILIO_SMS_FROM) {
      missing.push("TWILIO_WHATSAPP_FROM or TWILIO_SMS_FROM");
    }
    if (missing.length) {
      throw new ProviderMisconfiguredError(
        `Twilio provider not configured: missing ${missing.join(", ")}`,
      );
    }
    this.accountSid = env.TWILIO_ACCOUNT_SID!;
    this.authToken = env.TWILIO_AUTH_TOKEN!;
    this.whatsappFrom = env.TWILIO_WHATSAPP_FROM;
    this.smsFrom = env.TWILIO_SMS_FROM;
  }

  isLive() { return true; }

  private requireFrom(channel: "whatsapp" | "sms"): string {
    const from = channel === "whatsapp" ? this.whatsappFrom : this.smsFrom;
    if (!from) {
      throw new ProviderMisconfiguredError(
        `Twilio provider not configured for channel ${channel}`,
      );
    }
    return from;
  }

  async sendVerification(input: SendVerificationInput): Promise<void> {
    this.requireFrom(input.channel);
    // TODO(prod-twilio): POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
    // with Basic auth (sid:token) and form-encoded { From, To, Body }.
    // Throwing here instead of pretending to succeed.
    throw new ProviderMisconfiguredError(
      "Twilio REST call not yet implemented in this build; configure SEQUENCENOW or wire the REST call before shipping.",
    );
  }

  async sendApprovalRequest(input: SendApprovalInput): Promise<void> {
    this.requireFrom(input.channel);
    throw new ProviderMisconfiguredError(
      "Twilio REST call not yet implemented in this build; configure SEQUENCENOW or wire the REST call before shipping.",
    );
  }
}

/**
 * Safe stub for the internal SequenceNow MCP / webhook integration. Same
 * fail-loud rules as Twilio — no silent success.
 */
export class SequenceNowProvider implements Provider {
  name = "sequencenow";
  private webhookUrl: string;
  private apiKey: string;

  constructor(env: ProviderEnv) {
    const missing: string[] = [];
    if (!env.SEQUENCENOW_WEBHOOK_URL) missing.push("SEQUENCENOW_WEBHOOK_URL");
    if (!env.SEQUENCENOW_API_KEY) missing.push("SEQUENCENOW_API_KEY");
    if (missing.length) {
      throw new ProviderMisconfiguredError(
        `SequenceNow provider not configured: missing ${missing.join(", ")}`,
      );
    }
    this.webhookUrl = env.SEQUENCENOW_WEBHOOK_URL!;
    this.apiKey = env.SEQUENCENOW_API_KEY!;
  }

  isLive() { return true; }

  async sendVerification(_input: SendVerificationInput): Promise<void> {
    // TODO(prod-sequencenow): POST to this.webhookUrl with the verification
    // payload. Not implemented in this build — fail loud instead of pretending.
    throw new ProviderMisconfiguredError(
      "SequenceNow REST call not yet implemented in this build.",
    );
  }
  async sendApprovalRequest(_input: SendApprovalInput): Promise<void> {
    throw new ProviderMisconfiguredError(
      "SequenceNow REST call not yet implemented in this build.",
    );
  }
}

/**
 * Resolves the configured provider with strict production guardrails:
 *
 * - In production, OHM7_MESSAGE_PROVIDER must be explicitly set.
 * - Simulated in production requires OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true.
 * - Twilio / SequenceNow throw clearly when their env vars are missing.
 * - "disabled" returns a DisabledProvider that refuses to send.
 */
export function resolveProvider(env: ProviderEnv = process.env): Provider {
  const mode = resolveMode(env);
  switch (mode) {
    case "disabled":
      return new DisabledProvider();
    case "twilio":
      return new TwilioProvider(env);
    case "sequencenow":
      return new SequenceNowProvider(env);
    case "simulated": {
      if (env.NODE_ENV === "production" && env.OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION !== "true") {
        throw new ProviderMisconfiguredError(
          "Simulated provider is not allowed in production. Set OHM7_MESSAGE_PROVIDER to 'twilio' / 'sequencenow' / 'disabled' or explicitly set OHM7_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true (NOT recommended).",
        );
      }
      return new SimulatedProvider();
    }
  }
}

let _cached: Provider | null = null;

export function getProvider(): Provider {
  if (!_cached) _cached = resolveProvider();
  return _cached;
}

/** Test helper — clears the cache so each test resolves independently. */
export function _resetProviderForTests() {
  _cached = null;
}

export function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000));
}
