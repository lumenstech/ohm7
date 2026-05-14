import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canManageProperty } from "@/lib/dht/permissions";
import { writeAudit } from "@/lib/dht/audit";

async function approve(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const grantId = String(formData.get("grantId") ?? "");
  const g = await prisma.accessGrant.findUnique({ where: { id: grantId } });
  if (!g) notFound();
  if (!(await canManageProperty(user, g.propertyId))) {
    redirect(`/dashboard/access-requests/${grantId}?error=${encodeURIComponent("Not allowed")}`);
  }
  await prisma.accessGrant.update({
    where: { id: grantId },
    data: { status: "approved", approvedAt: new Date(), approvedByUserId: user.id },
  });
  await writeAudit({
    actorUserId: user.id, actorRole: user.role,
    action: "grant.approved", entityType: "AccessGrant", entityId: grantId,
    metadata: { propertyId: g.propertyId },
  });
  redirect(`/dashboard/access-requests/${grantId}`);
}

async function deny(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const grantId = String(formData.get("grantId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const g = await prisma.accessGrant.findUnique({ where: { id: grantId } });
  if (!g) notFound();
  if (!(await canManageProperty(user, g.propertyId))) {
    redirect(`/dashboard/access-requests/${grantId}?error=${encodeURIComponent("Not allowed")}`);
  }
  await prisma.accessGrant.update({
    where: { id: grantId },
    data: { status: "denied", deniedAt: new Date(), reasonDenied: reason || null },
  });
  await writeAudit({
    actorUserId: user.id, actorRole: user.role,
    action: "grant.denied", entityType: "AccessGrant", entityId: grantId,
    metadata: { reason },
  });
  redirect(`/dashboard/access-requests/${grantId}`);
}

async function revoke(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const grantId = String(formData.get("grantId") ?? "");
  const g = await prisma.accessGrant.findUnique({ where: { id: grantId } });
  if (!g) notFound();
  if (!(await canManageProperty(user, g.propertyId))) {
    redirect(`/dashboard/access-requests/${grantId}?error=${encodeURIComponent("Not allowed")}`);
  }
  await prisma.accessGrant.update({
    where: { id: grantId },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: user.id, actorRole: user.role,
    action: "grant.revoked", entityType: "AccessGrant", entityId: grantId,
    metadata: {},
  });
  redirect(`/dashboard/access-requests/${grantId}`);
}

export default async function AccessRequestPage({
  params,
  searchParams,
}: {
  params: { grantId: string };
  searchParams: { action?: string; error?: string };
}) {
  const user = await requireCurrentUser();
  const g = await prisma.accessGrant.findUnique({
    where: { id: params.grantId },
    include: { property: true },
  });
  if (!g) notFound();
  const isManager = await canManageProperty(user, g.propertyId);
  const isRequester = g.tradeUserId === user.id;
  if (!isManager && !isRequester) notFound();

  return (
    <div className="max-w-xl space-y-5">
      <Link className="text-sm text-bolt-700" href="/dashboard/access-requests">← All requests</Link>
      <header>
        <h1 className="text-2xl font-semibold">{g.requesterName}</h1>
        <p className="text-sm text-ink-500">
          {g.property.addressLine1} · scope: <strong>{g.scope}</strong> · via <strong>{g.createdVia}</strong>
        </p>
      </header>
      <div className="card-pad">
        <div className="text-sm space-y-1">
          {g.requesterCompany && <div><strong>Company:</strong> {g.requesterCompany}</div>}
          {g.requesterPhone && <div><strong>Phone:</strong> {g.requesterPhone}</div>}
          {g.requesterEmail && <div><strong>Email:</strong> {g.requesterEmail}</div>}
          {g.requesterLicense && <div><strong>License:</strong> {g.requesterLicense}</div>}
          {g.reason && <div className="pt-2 border-t border-ink-100"><strong>Reason:</strong> {g.reason}</div>}
        </div>
      </div>

      <div className="card-pad">
        <div className="text-sm">Status: <strong>{g.status}</strong></div>
        {g.approvedAt && <div className="text-xs text-ink-500">Approved {new Date(g.approvedAt).toLocaleString()}</div>}
        {g.deniedAt && <div className="text-xs text-ink-500">Denied {new Date(g.deniedAt).toLocaleString()}</div>}
        {g.revokedAt && <div className="text-xs text-ink-500">Revoked {new Date(g.revokedAt).toLocaleString()}</div>}
      </div>

      {isManager && g.status === "pending" && (
        <div className="card-pad space-y-3">
          <form action={approve}>
            <input type="hidden" name="grantId" value={g.id} />
            <button className="btn-primary" type="submit">Approve</button>
          </form>
          <form action={deny} className="space-y-2">
            <input type="hidden" name="grantId" value={g.id} />
            <input name="reason" className="input" placeholder="Reason for denial (optional)" />
            <button className="btn-secondary" type="submit">Deny</button>
          </form>
        </div>
      )}
      {isManager && g.status === "approved" && (
        <div className="card-pad">
          <form action={revoke}>
            <input type="hidden" name="grantId" value={g.id} />
            <button className="btn-danger" type="submit">Revoke access</button>
          </form>
        </div>
      )}
    </div>
  );
}
