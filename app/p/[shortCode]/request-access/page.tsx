import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeShortCode } from "@/lib/short-code";
import { createGrantSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";
import {
  getProvider,
  ProviderMisconfiguredError,
  ProviderUnavailableError,
} from "@/lib/ohm7/provider";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ohm7/rate-limit";
import { headers } from "next/headers";
import { SafetyNotice } from "@/components/safety-notice";

async function submitRequest(formData: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for") ?? "anon";
  if (!(await rateLimit().check(`grant-req:${ip}`, 10, 60_000))) {
    redirect(`/p/${formData.get("shortCode")}/request-access?error=${encodeURIComponent("Too many requests, try again in a minute")}`);
  }
  const parsed = createGrantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const code = formData.get("shortCode") ?? "";
    redirect(`/p/${code}/request-access?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const data = parsed.data;
  const code = normalizeShortCode(data.shortCode);
  const sc = await prisma.panelShortCode.findUnique({
    where: { shortCode: code },
    include: { panel: { include: { property: { include: { owner: true } } } } },
  });
  if (!sc || sc.status !== "active" || !sc.panel) {
    redirect(`/p/${code}/request-access?error=${encodeURIComponent("Sticker is not active")}`);
  }

  const user = await getCurrentUser();
  const grant = await prisma.accessGrant.create({
    data: {
      propertyId: sc.panel.propertyId,
      panelId: sc.panel.id,
      tradeUserId: user?.id ?? null,
      requesterName: data.requesterName,
      requesterCompany: data.requesterCompany || null,
      requesterPhone: data.requesterPhone || null,
      requesterEmail: data.requesterEmail || null,
      requesterLicense: data.requesterLicense || null,
      reason: data.reason,
      scope: data.scope,
      status: "pending",
      createdVia: "scan",
    },
  });

  await prisma.scanEvent.create({
    data: { shortCodeId: sc.id, outcome: "access_requested", scannedByUserId: user?.id ?? null },
  });

  await writeAudit({
    actorUserId: user?.id ?? null,
    actorRole: user?.role ?? null,
    action: "grant.requested",
    entityType: "AccessGrant",
    entityId: grant.id,
    metadata: { propertyId: grant.propertyId, requesterName: grant.requesterName, via: "scan" },
  });

  // Notify owner. Provider failures should NOT silently swallow the grant —
  // the request row exists either way; the owner just needs to be re-pinged
  // by an admin if messaging is unavailable. Audit the outcome.
  const ownerPhone = sc.panel.property.owner?.phone;
  if (ownerPhone) {
    const approveUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/access-requests/${grant.id}?action=approve`;
    const denyUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/access-requests/${grant.id}?action=deny`;
    try {
      const provider = getProvider();
      if (provider.isLive()) {
        await provider.sendApprovalRequest({
          channel: "whatsapp",
          toPhone: ownerPhone,
          body: `${grant.requesterName} (${grant.requesterCompany ?? "independent"}) is requesting access to your property record. Reason: ${grant.reason}`,
          approveUrl,
          denyUrl,
        });
      } else {
        await writeAudit({
          action: "grant.notify_skipped",
          entityType: "AccessGrant",
          entityId: grant.id,
          metadata: { reason: "messaging disabled" },
        });
      }
    } catch (e) {
      if (e instanceof ProviderUnavailableError || e instanceof ProviderMisconfiguredError) {
        await writeAudit({
          action: "grant.notify_failed",
          entityType: "AccessGrant",
          entityId: grant.id,
          metadata: { error: e.message },
        });
      } else {
        throw e;
      }
    }
  }

  redirect(`/p/${code}/request-access?submitted=1`);
}

export default async function RequestAccessPage({
  params,
  searchParams,
}: {
  params: { shortCode: string };
  searchParams: { error?: string; submitted?: string };
}) {
  const code = normalizeShortCode(params.shortCode);
  const sc = await prisma.panelShortCode.findUnique({ where: { shortCode: code } });
  if (!sc) notFound();

  if (searchParams.submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Request sent</h1>
        <p className="mt-2 text-ink-600">
          The owner has been notified by WhatsApp/SMS. You'll receive a message back when they
          approve or deny. Nothing happens automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Request access</h1>
      <p className="text-sm text-ink-600">
        Code <span className="font-mono">{code}</span>. The owner must approve before you see any
        private details.
      </p>
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={submitRequest} className="space-y-4">
        <input type="hidden" name="shortCode" value={code} />
        <div>
          <label className="label" htmlFor="requesterName">Your name</label>
          <input id="requesterName" name="requesterName" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="requesterCompany">Company</label>
          <input id="requesterCompany" name="requesterCompany" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="requesterPhone">Phone</label>
          <input id="requesterPhone" name="requesterPhone" className="input" inputMode="tel" />
        </div>
        <div>
          <label className="label" htmlFor="requesterEmail">Email</label>
          <input id="requesterEmail" name="requesterEmail" type="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="requesterLicense">License # (optional)</label>
          <input id="requesterLicense" name="requesterLicense" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="scope">Scope</label>
          <select id="scope" name="scope" className="select" defaultValue="property">
            <option value="property">Whole property</option>
            <option value="panel">This panel only</option>
            <option value="unit">A specific unit</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reason">Reason for access</label>
          <textarea id="reason" name="reason" required rows={3} className="textarea" />
        </div>
        <button className="btn-primary w-full" type="submit">Send request to owner</button>
      </form>
      <SafetyNotice />
    </div>
  );
}
