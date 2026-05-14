import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MessageProvider } from "@/lib/dht/provider";
import {
  ApprovalCallbackInput,
  ApprovalCallbackResult,
  ApprovalOrchestrator,
  ApprovalOutcome,
  ApprovalRequestRecord,
  OrchestratorMisconfiguredError,
  RequestApprovalInput,
} from "./types";

export const APPROVAL_TEMPLATE_NAME = "dht_property_access_request";
export const APPROVAL_TEMPLATE_LANG = "en_US";

const DEFAULT_TTL_SECONDS = 15 * 60;

export class SequenceNowOrchestrator implements ApprovalOrchestrator {
  readonly mode = "sequencenow" as const;

  constructor(
    private readonly provider: MessageProvider,
    private readonly webhookSecret: string,
  ) {
    void this.webhookSecret;
  }

  isLive(): boolean {
    return this.provider.isLive();
  }

  async requestApproval(input: RequestApprovalInput): Promise<ApprovalRequestRecord> {
    const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const sendResult = await this.provider.send({
      to: input.approverPhone,
      channel: "whatsapp",
      template: {
        name: APPROVAL_TEMPLATE_NAME,
        language: APPROVAL_TEMPLATE_LANG,
        variables: {
          requester_name: input.context.requesterName,
          requester_org: input.context.requesterOrg,
          property_address: input.context.propertyAddress,
          work_summary: input.context.workSummary,
        },
        buttons: [
          { type: "quick_reply", payload: `approve:${input.correlationId}`, text: "Approve" },
          { type: "quick_reply", payload: `deny:${input.correlationId}`, text: "Deny" },
          { type: "quick_reply", payload: `once:${input.correlationId}`, text: "Approve once" },
        ],
      },
    });

    const record = await prisma.approvalRequest.create({
      data: {
        correlationId: input.correlationId,
        providerMessageId: sendResult.providerMessageId,
        approverPhone: input.approverPhone,
        approverUserId: input.approverUserId ?? null,
        status: "pending",
        expiresAt,
        context: input.context as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: record.id,
      correlationId: record.correlationId,
      providerMessageId: record.providerMessageId,
      expiresAt: record.expiresAt,
    };
  }

  async handleCallback(input: ApprovalCallbackInput): Promise<ApprovalCallbackResult> {
    const row = await prisma.approvalRequest.findFirst({
      where: { providerMessageId: input.providerMessageId },
    });
    if (!row) return { resolved: false };
    if (row.status !== "pending") {
      return { resolved: false, correlationId: row.correlationId };
    }
    if (row.expiresAt < input.receivedAt) {
      await prisma.approvalRequest.update({
        where: { id: row.id },
        data: { status: "expired" },
      });
      return { resolved: false, correlationId: row.correlationId };
    }
    if (row.approverPhone !== input.from) {
      // Spoofed reply; record-silent rejection.
      return { resolved: false, correlationId: row.correlationId };
    }

    let outcome: ApprovalOutcome | null = null;
    if (input.payload.startsWith("approve:")) outcome = "approved";
    else if (input.payload.startsWith("deny:")) outcome = "denied";
    else if (input.payload.startsWith("once:")) outcome = "approved_once";

    if (!outcome) {
      return { resolved: false, correlationId: row.correlationId };
    }

    await prisma.approvalRequest.update({
      where: { id: row.id },
      data: { status: outcome, resolvedAt: input.receivedAt },
    });

    return { resolved: true, correlationId: row.correlationId, outcome };
  }
}

type SequenceNowEnv = { DHT_SEQUENCENOW_WEBHOOK_SECRET?: string } & Record<string, string | undefined>;

export function buildSequenceNowFromEnv(
  provider: MessageProvider,
  env: SequenceNowEnv = process.env as unknown as SequenceNowEnv,
): SequenceNowOrchestrator {
  const secret = env.DHT_SEQUENCENOW_WEBHOOK_SECRET;
  if (!secret) {
    throw new OrchestratorMisconfiguredError(
      "DHT_SEQUENCENOW_WEBHOOK_SECRET required when DHT_APPROVAL_ORCHESTRATOR=sequencenow",
    );
  }
  return new SequenceNowOrchestrator(provider, secret);
}
