import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canRecordOnProperty } from "@/lib/dht/permissions";
import { createCircuitSchema } from "@/lib/dht/zod-schemas";
import { writeAudit } from "@/lib/dht/audit";

async function action(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const panelId = String(formData.get("panelId") ?? "");
  const panel = await prisma.panel.findUnique({ where: { id: panelId } });
  if (!panel) redirect("/dashboard/properties");
  if (!(await canRecordOnProperty(user, panel.propertyId))) {
    redirect(`/dashboard/panels/${panelId}?error=${encodeURIComponent("Not allowed")}`);
  }
  const parsed = createCircuitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/dashboard/panels/${panelId}/circuits/new?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid",
      )}`,
    );
  }
  const d = parsed.data;
  try {
    const c = await prisma.circuit.create({
      data: {
        panelId,
        circuitNumber: d.circuitNumber,
        label: d.label || null,
        areaServed: d.areaServed || null,
        loadType: d.loadType || null,
        breakerAmperage: d.breakerAmperage ?? null,
        breakerPoleCount: d.breakerPoleCount ?? null,
        breakerManufacturer: d.breakerManufacturer || null,
        breakerModel: d.breakerModel || null,
        protectionType: d.protectionType,
        isTandem: d.isTandem,
        notes: d.notes || null,
        addedByUserId: user.id,
      },
    });
    await writeAudit({
      actorUserId: user.id,
      actorRole: user.role,
      action: "circuit.created",
      entityType: "Circuit",
      entityId: c.id,
      metadata: { panelId, circuitNumber: c.circuitNumber },
    });
  } catch (e) {
    redirect(
      `/dashboard/panels/${panelId}/circuits/new?error=${encodeURIComponent("Could not create circuit (duplicate slot?)")}`,
    );
  }
  redirect(`/dashboard/panels/${panelId}`);
}

export default async function NewCircuitPage({
  params,
  searchParams,
}: {
  params: { panelId: string };
  searchParams: { error?: string };
}) {
  const user = await requireCurrentUser();
  const panel = await prisma.panel.findUnique({ where: { id: params.panelId } });
  if (!panel) notFound();
  if (!(await canRecordOnProperty(user, panel.propertyId))) notFound();
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Add a circuit</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="panelId" value={params.panelId} />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="circuitNumber">Slot #</label>
            <input id="circuitNumber" name="circuitNumber" type="number" min={1} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="breakerAmperage">Amps</label>
            <input id="breakerAmperage" name="breakerAmperage" type="number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="breakerPoleCount">Poles</label>
            <select id="breakerPoleCount" name="breakerPoleCount" className="select" defaultValue={1}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="label">Label</label>
          <input id="label" name="label" className="input" placeholder="Kitchen counter" />
        </div>
        <div>
          <label className="label" htmlFor="areaServed">Area served</label>
          <input id="areaServed" name="areaServed" className="input" placeholder="Kitchen, dining" />
        </div>
        <div>
          <label className="label" htmlFor="loadType">Load type</label>
          <input id="loadType" name="loadType" className="input" placeholder="Receptacles / lighting / AC condenser" />
        </div>
        <div>
          <label className="label" htmlFor="protectionType">Protection</label>
          <select id="protectionType" name="protectionType" className="select" defaultValue="standard">
            <option value="standard">Standard</option>
            <option value="afci">AFCI</option>
            <option value="gfci">GFCI</option>
            <option value="dfci">DFCI</option>
            <option value="cafci">CAFCI</option>
            <option value="dual_function">Dual function (AFCI+GFCI)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="breakerManufacturer">Breaker mfg</label>
            <input id="breakerManufacturer" name="breakerManufacturer" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="breakerModel">Breaker model</label>
            <input id="breakerModel" name="breakerModel" className="input" />
          </div>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input name="isTandem" type="checkbox" value="true" /> Tandem breaker
        </label>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" className="textarea" rows={2} />
        </div>
        <button className="btn-primary" type="submit">Add circuit</button>
      </form>
    </div>
  );
}
