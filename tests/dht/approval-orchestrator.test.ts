import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  DisabledOrchestrator,
  OrchestratorMisconfiguredError,
  SequenceNowOrchestrator,
  resolveOrchestrator,
} from "@/lib/dht/approval";
import { SimulatedProvider } from "@/lib/dht/provider";

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

let prisma: PrismaClient;

describe("resolveOrchestrator (pure)", () => {
  it("throws in production when DHT_APPROVAL_ORCHESTRATOR is unset", () => {
    expect(() => resolveOrchestrator({ NODE_ENV: "production" })).toThrow(
      OrchestratorMisconfiguredError,
    );
  });

  it("returns DisabledOrchestrator in development by default", () => {
    const o = resolveOrchestrator({ NODE_ENV: "development" });
    expect(o).toBeInstanceOf(DisabledOrchestrator);
    expect(o.isLive()).toBe(false);
  });

  it("returns DisabledOrchestrator when explicit disabled", () => {
    const o = resolveOrchestrator({
      NODE_ENV: "production",
      DHT_APPROVAL_ORCHESTRATOR: "disabled",
    });
    expect(o).toBeInstanceOf(DisabledOrchestrator);
  });

  it("sequencenow requires DHT_SEQUENCENOW_WEBHOOK_SECRET", () => {
    expect(() =>
      resolveOrchestrator({
        NODE_ENV: "production",
        DHT_APPROVAL_ORCHESTRATOR: "sequencenow",
        // Provider also needs to resolve — give it dialog360 + key
        DHT_MESSAGE_PROVIDER: "dialog360",
        DHT_DIALOG360_API_KEY: "k",
      }),
    ).toThrow(OrchestratorMisconfiguredError);
  });

  it("sequencenow constructs when all required env is present", () => {
    const o = resolveOrchestrator({
      NODE_ENV: "production",
      DHT_APPROVAL_ORCHESTRATOR: "sequencenow",
      DHT_SEQUENCENOW_WEBHOOK_SECRET: "sssh",
      DHT_MESSAGE_PROVIDER: "dialog360",
      DHT_DIALOG360_API_KEY: "k",
    });
    expect(o).toBeInstanceOf(SequenceNowOrchestrator);
  });

  it("Disabled refuses to send", async () => {
    const o = new DisabledOrchestrator();
    await expect(
      o.requestApproval({
        approverPhone: "+1",
        context: { requesterName: "x", requesterOrg: "y", propertyAddress: "z", workSummary: "w" },
        correlationId: "c",
      }),
    ).rejects.toBeInstanceOf(OrchestratorMisconfiguredError);
  });
});

d("SequenceNowOrchestrator (db)", () => {
  beforeAll(() => {
    prisma = new PrismaClient();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.approvalRequest.deleteMany({ where: { correlationId: { startsWith: "TEST::" } } });
    SimulatedProvider.drainOutbox();
  });

  function freshOrchestrator(provider = new SimulatedProvider()) {
    return new SequenceNowOrchestrator(provider, "test-secret");
  }

  it("requestApproval writes an ApprovalRequest row and calls provider.send with a template + 3 buttons", async () => {
    const o = freshOrchestrator();
    const rec = await o.requestApproval({
      approverPhone: "+15555550100",
      context: {
        requesterName: "Acme",
        requesterOrg: "Acme Electric",
        propertyAddress: "1 Main St",
        workSummary: "log today's work",
      },
      correlationId: "TEST::cor-1",
    });

    expect(rec.correlationId).toBe("TEST::cor-1");
    const out = SimulatedProvider.drainOutbox();
    expect(out).toHaveLength(1);
    expect(out[0].template?.buttons).toHaveLength(3);
    expect(out[0].template?.buttons?.map((b) => b.payload)).toEqual([
      "approve:TEST::cor-1",
      "deny:TEST::cor-1",
      "once:TEST::cor-1",
    ]);

    const row = await prisma.approvalRequest.findUnique({ where: { correlationId: "TEST::cor-1" } });
    expect(row?.status).toBe("pending");
  });

  it("handleCallback resolves when payload + phone match and not expired", async () => {
    const o = freshOrchestrator();
    const rec = await o.requestApproval({
      approverPhone: "+15555550100",
      context: { requesterName: "Acme", requesterOrg: "Acme", propertyAddress: "x", workSummary: "y" },
      correlationId: "TEST::cor-2",
    });
    const result = await o.handleCallback({
      providerMessageId: rec.providerMessageId,
      payload: "approve:TEST::cor-2",
      from: "+15555550100",
      receivedAt: new Date(),
    });
    expect(result).toEqual({ resolved: true, correlationId: "TEST::cor-2", outcome: "approved" });

    const row = await prisma.approvalRequest.findUnique({ where: { correlationId: "TEST::cor-2" } });
    expect(row?.status).toBe("approved");
  });

  it("rejects callback when 'from' phone does not match approver (spoof attempt)", async () => {
    const o = freshOrchestrator();
    const rec = await o.requestApproval({
      approverPhone: "+15555550100",
      context: { requesterName: "Acme", requesterOrg: "Acme", propertyAddress: "x", workSummary: "y" },
      correlationId: "TEST::cor-3",
    });
    const result = await o.handleCallback({
      providerMessageId: rec.providerMessageId,
      payload: "approve:TEST::cor-3",
      from: "+19999999999",
      receivedAt: new Date(),
    });
    expect(result.resolved).toBe(false);
    const row = await prisma.approvalRequest.findUnique({ where: { correlationId: "TEST::cor-3" } });
    expect(row?.status).toBe("pending");
  });

  it("marks the row expired when callback arrives past expiresAt", async () => {
    const o = freshOrchestrator();
    const rec = await o.requestApproval({
      approverPhone: "+15555550100",
      context: { requesterName: "Acme", requesterOrg: "Acme", propertyAddress: "x", workSummary: "y" },
      correlationId: "TEST::cor-4",
      ttlSeconds: 1,
    });
    const result = await o.handleCallback({
      providerMessageId: rec.providerMessageId,
      payload: "approve:TEST::cor-4",
      from: "+15555550100",
      receivedAt: new Date(Date.now() + 5_000),
    });
    expect(result.resolved).toBe(false);
    const row = await prisma.approvalRequest.findUnique({ where: { correlationId: "TEST::cor-4" } });
    expect(row?.status).toBe("expired");
  });

  it("ignores unknown payload prefixes", async () => {
    const o = freshOrchestrator();
    const rec = await o.requestApproval({
      approverPhone: "+15555550100",
      context: { requesterName: "Acme", requesterOrg: "Acme", propertyAddress: "x", workSummary: "y" },
      correlationId: "TEST::cor-5",
    });
    const result = await o.handleCallback({
      providerMessageId: rec.providerMessageId,
      payload: "wat:huh",
      from: "+15555550100",
      receivedAt: new Date(),
    });
    expect(result.resolved).toBe(false);
  });
});
