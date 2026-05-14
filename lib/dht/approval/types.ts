// ApprovalOrchestrator is the higher-level workflow on top of a MessageProvider.
// SequenceNow is implemented here, NOT as a peer of Dialog360/Gupshup.

export type OrchestratorMode = "sequencenow" | "disabled";

export type ApprovalContext = {
  requesterName: string;       // "[Electrician Name]"
  requesterOrg: string;        // "[Trade Org]"
  propertyAddress: string;
  workSummary: string;         // "log today's electrical service work"
};

export type RequestApprovalInput = {
  /** WhatsApp E.164 phone of the approver (property owner) */
  approverPhone: string;
  context: ApprovalContext;
  /** Internal correlation id (propertyId + grantee + nonce) */
  correlationId: string;
  /** Approver Auth0 sub if known, for the callback verification */
  approverUserId?: string;
  /** Optional override; defaults to 15 minutes */
  ttlSeconds?: number;
};

export type ApprovalRequestRecord = {
  id: string;
  correlationId: string;
  providerMessageId: string;
  expiresAt: Date;
};

export type ApprovalCallbackInput = {
  /** Provider message id the user replied to */
  providerMessageId: string;
  /** "approve:<correlationId>" | "deny:<correlationId>" | "once:<correlationId>" */
  payload: string;
  /** Phone that responded (must match approverPhone) */
  from: string;
  receivedAt: Date;
};

export type ApprovalOutcome = "approved" | "denied" | "approved_once";

export type ApprovalCallbackResult = {
  resolved: boolean;
  correlationId?: string;
  outcome?: ApprovalOutcome;
};

export interface ApprovalOrchestrator {
  readonly mode: OrchestratorMode;
  isLive(): boolean;
  requestApproval(input: RequestApprovalInput): Promise<ApprovalRequestRecord>;
  handleCallback(input: ApprovalCallbackInput): Promise<ApprovalCallbackResult>;
}

export class OrchestratorMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestratorMisconfiguredError";
  }
}
