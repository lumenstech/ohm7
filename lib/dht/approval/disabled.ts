import {
  ApprovalCallbackInput,
  ApprovalCallbackResult,
  ApprovalOrchestrator,
  ApprovalRequestRecord,
  OrchestratorMisconfiguredError,
  RequestApprovalInput,
} from "./types";

export class DisabledOrchestrator implements ApprovalOrchestrator {
  readonly mode = "disabled" as const;
  isLive(): boolean {
    return false;
  }
  async requestApproval(_input: RequestApprovalInput): Promise<ApprovalRequestRecord> {
    throw new OrchestratorMisconfiguredError(
      "Approval orchestrator is disabled. Set DHT_APPROVAL_ORCHESTRATOR to enable.",
    );
  }
  async handleCallback(_input: ApprovalCallbackInput): Promise<ApprovalCallbackResult> {
    return { resolved: false };
  }
}
