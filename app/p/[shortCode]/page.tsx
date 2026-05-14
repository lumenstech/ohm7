import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildPublicScanView } from "@/lib/dht/scan-view";
import { normalizeShortCode } from "@/lib/short-code";
import { headers } from "next/headers";
import { SafetyNotice } from "@/components/safety-notice";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: { shortCode: string } }) {
  const code = normalizeShortCode(params.shortCode);
  const record = await prisma.panelShortCode.findUnique({
    where: { shortCode: code },
    include: {
      panel: {
        select: {
          id: true,
          nickname: true,
          recallFlag: true,
          recallReason: true,
          property: {
            select: {
              city: true,
              state: true,
              jurisdiction: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!record) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Unknown sticker</h1>
        <p className="mt-2 text-ink-600">
          This code (<code className="font-mono">{code}</code>) isn't recognized. If you printed
          this sticker yourself, try re-scanning. Otherwise contact the property owner.
        </p>
      </div>
    );
  }

  const view = buildPublicScanView({
    shortCode: record.shortCode,
    status: record.status,
    panel: record.panel as never,
  });

  // Best-effort scan log (don't block render on errors).
  try {
    const h = headers();
    await prisma.scanEvent.create({
      data: {
        shortCodeId: record.id,
        ipAddress: h.get("x-forwarded-for") ?? null,
        userAgent: h.get("user-agent") ?? null,
        outcome: "viewed_public",
      },
    });
    await prisma.panelShortCode.update({
      where: { id: record.id },
      data: { lastScannedAt: new Date(), scanCount: { increment: 1 } },
    });
  } catch {
    // ignore
  }

  if (view.status === "unassigned") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 space-y-6">
        <h1 className="text-2xl font-semibold">Sticker not yet registered</h1>
        <p className="text-ink-600">
          Code <span className="font-mono">{view.shortCode}</span> has not been linked to a
          property. If you are the property owner, register it now. Trades cannot claim a property
          on their own.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/claim/${view.shortCode}`} className="btn-primary">Register this panel</Link>
          <Link href="/auth/login?screen_hint=signup" className="btn-secondary">Create an owner account</Link>
        </div>
        <SafetyNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <header>
        <span className="badge-muted">Public scan view</span>
        <h1 className="mt-2 text-2xl font-semibold">{view.panelNickname ?? "Electrical panel"}</h1>
        <p className="text-ink-600">
          {view.cityState ?? "Address withheld"}
          {view.jurisdictionName ? ` · ${view.jurisdictionName}` : null}
        </p>
      </header>

      {view.recallFlag && (
        <div className="card border-red-200 bg-red-50 p-4">
          <strong className="block text-red-800">Hazard flag</strong>
          <p className="text-sm text-red-800 mt-1">{view.recallSummary}</p>
        </div>
      )}

      <div className="card-pad space-y-2">
        <p className="text-sm text-ink-700">
          To see the panel directory, breaker schedule, or service history, the property owner must
          approve your access.
        </p>
        <Link href={`/p/${view.shortCode}/request-access`} className="btn-primary">
          Request access
        </Link>
      </div>

      <SafetyNotice />
    </div>
  );
}
