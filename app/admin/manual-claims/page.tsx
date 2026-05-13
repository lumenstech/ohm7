import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/ohm7/audit";

async function manualOverride(formData: FormData) {
  "use server";
  const admin = await requireRole(["admin"]);
  const claimId = String(formData.get("claimId") ?? "");
  const note = String(formData.get("note") ?? "");
  const claim = await prisma.propertyClaim.findUnique({
    where: { id: claimId },
    include: { shortCode: true },
  });
  if (!claim) notFound();

  // Admin override: mark claim verified by hand, attaching to a placeholder
  // owner User unless one already exists.
  let ownerId = claim.claimantUserId;
  if (!ownerId) {
    const email = claim.claimantEmail ?? `pending+${claim.id}@ohm7.local`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: "manual-override",
        fullName: claim.claimantName,
        phone: claim.claimantPhone,
        role: "owner",
      },
    });
    ownerId = u.id;
  }

  const property = await prisma.property.create({
    data: {
      addressLine1: claim.submittedAddress,
      city: claim.submittedCity,
      state: claim.submittedState,
      zip: claim.submittedZip,
      ownerUserId: ownerId,
    },
  });
  if (claim.shortCodeId) {
    await prisma.panelShortCode.update({
      where: { id: claim.shortCodeId },
      data: { propertyId: property.id, status: "active", activatedAt: new Date(), activatedByUserId: admin.id },
    });
  }
  await prisma.propertyClaim.update({
    where: { id: claim.id },
    data: { verificationStatus: "manually_verified", ownerVerifiedAt: new Date(), propertyId: property.id, notes: note || null, claimantUserId: ownerId },
  });
  await writeAudit({
    actorUserId: admin.id, actorRole: admin.role,
    action: "claim.manual_override", entityType: "PropertyClaim", entityId: claim.id,
    metadata: { note, propertyId: property.id },
  });
  redirect("/admin/manual-claims");
}

export const dynamic = "force-dynamic";

export default async function ManualClaimsPage() {
  await requireRole(["admin"]);
  const claims = await prisma.propertyClaim.findMany({
    where: { verificationStatus: { in: ["sent", "stalled", "failed", "pending"] } },
    orderBy: { createdAt: "desc" },
    include: { shortCode: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin · manual claims</h1>
      <p className="text-sm text-ink-500">
        Stalled or unverified claims. Every manual override writes an audit event.
      </p>
      {claims.length === 0 ? (
        <p className="text-sm text-ink-500">No pending claims.</p>
      ) : (
        <ul className="space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="card-pad">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{c.claimantName}</div>
                  <div className="text-xs text-ink-500">{c.submittedAddress} · {c.claimantPhone} · {c.verificationStatus}</div>
                </div>
                <span className="badge-warn">{c.verificationStatus}</span>
              </div>
              <form action={manualOverride} className="mt-3 flex gap-2">
                <input type="hidden" name="claimId" value={c.id} />
                <input name="note" className="input" placeholder="Override note (required audit metadata)" required />
                <button className="btn-danger" type="submit">Manually verify</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
