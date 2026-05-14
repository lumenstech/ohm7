// MessageProvider sends raw WhatsApp / SMS messages via a BSP.
// It does NOT manage approval workflows — that's ApprovalOrchestrator.

export type ProviderMode = "dialog360" | "gupshup" | "simulated" | "disabled";

export type TemplateButton = {
  type: "quick_reply";
  payload: string;
  text: string;
};

export type SendMessageInput = {
  /** E.164 phone number */
  to: string;
  channel: "whatsapp" | "sms";
  template?: {
    name: string;
    language: string;
    variables: Record<string, string>;
    buttons?: TemplateButton[];
  };
  freeform?: {
    body: string;
  };
};

export type SendMessageResult = {
  providerMessageId: string;
  acceptedAt: Date;
};

export interface MessageProvider {
  readonly mode: ProviderMode;
  isLive(): boolean;
  send(input: SendMessageInput): Promise<SendMessageResult>;
}

export class ProviderMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderMisconfiguredError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
