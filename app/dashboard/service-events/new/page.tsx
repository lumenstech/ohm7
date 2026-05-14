import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canRecordOnProperty } from "@/lib/dht/permissions";
import { createServiceEventSchema } from "@/lib/dht/zod-schemas";
import { writeAudit } from "@/lib/dht/audit";

async function action(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const parsed = createServiceEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/dashboard/service-events/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const d = parsed.data;
  if (!(await canRecordOnProperty(user, d.propertyId))) {
    redirect(`/dashboard/service-events/new?error=${encodeURIComponent("Not allowed for this property")}`);
  }
  const necRefs = (d.necSectionReferenced || "")
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 20);

  const e = await prisma.serviceEvent.create({
    data: {
      propertyId: d.propertyId,
      panelId: d.panelId || null,
      circuitId: d.circuitId || null,
      unitId: d.unitId || null,
      performedByUserId: user.id,
      trade: d.trade,
      eventType: d.eventType,
      summary: d.summary,
      notes: d.notes || null,
      necSectionReferenced: necRefs,
      invoiceReference: d.invoiceReference || null,
      source: "manual",
      performedAt: new Date(),
    },
  });

  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "service_event.created",
    entityType: "ServiceEvent",
    entityId: e.id,
    metadata: { propertyId: d.propertyId, trade: d.trade, eventType: d.eventType },
  });

  redirect(`/dashboard/service-events/${e.id}`);
}

export default async function NewServiceEventPage({
  searchParams,
}: {
  searchParams: { propertyId?: string; panelId?: string; error?: string };
}) {
  const user = await requireCurrentUser();
  if (user.role === "tenant") redirect("/dashboard/tenant/service-requests/new");

  const where =
    user.role === "admin"
      ? {}
      : user.role === "owner"
        ? { ownerUserId: user.id }
        : { grants: { some: { tradeUserId: user.id, status: "approved" as const } } };

  const properties = await prisma.property.findMany({ where, orderBy: { createdAt: "desc" } });
  const panels = await prisma.panel.findMany({
    where: { property: where },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Add service event</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="propertyId">Property</label>
          <select id="propertyId" name="propertyId" className="select" required defaultValue={searchParams.propertyId ?? ""}>
            <option value="">— select —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname ?? p.addressLine1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="panelId">Panel (optional)</label>
          <select id="panelId" name="panelId" className="select" defaultValue={searchParams.panelId ?? ""}>
            <option value="">(none)</option>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname ?? p.id.slice(0, 6)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="trade">Trade</label>
            <select id="trade" name="trade" className="select" defaultValue="electrical">
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="hvac">HVAC</option>
              <option value="general">General</option>
              <option value="roofing">Roofing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="eventType">Event type</label>
            <select id="eventType" name="eventType" className="select" defaultValue="repair">
              <option value="install">Install</option>
              <option value="repair">Repair</option>
              <option value="replace">Replace</option>
              <option value="inspect">Inspect</option>
              <option value="troubleshoot">Troubleshoot</option>
              <option value="upgrade">Upgrade</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="summary">Summary</label>
          <input id="summary" name="summary" required className="input" maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={4} className="textarea" />
        </div>
        <div>
          <label className="label" htmlFor="necSectionReferenced">NEC section(s) referenced</label>
          <input id="necSectionReferenced" name="necSectionReferenced" className="input" placeholder="210.8(A), 408.4(A)" />
          <p className="help">Comma-separated. We never embed verbatim NEC text — only the section number.</p>
        </div>
        <div>
          <label className="label" htmlFor="invoiceReference">Invoice reference (optional)</label>
          <input id="invoiceReference" name="invoiceReference" className="input" />
        </div>
        <button className="btn-primary" type="submit">Save service event</button>
      </form>
    </div>
  );
}
