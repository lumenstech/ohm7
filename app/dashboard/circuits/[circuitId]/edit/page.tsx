import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canRecordOnProperty } from "@/lib/dht/permissions";
import { createCircuitSchema } from "@/lib/dht/zod-schemas";
import { writeAudit } from "@/lib/dht/audit";

async function action(formData: FormData) {
  "use server";
  const user = await requireCurrentUser();
  const circuitId = String(formData.get("circuitId") ?? "");
  const circuit = await prisma.circuit.findUnique({
    where: { id: circuitId },
    include: { panel: true },
  });
  if (!circuit) notFound();
  if (!(await canRecordOnProperty(user, circuit.panel.propertyId))) notFound();
  const parsed = createCircuitSchema.safeParse({
    ...Object.fromEntries(formData),
    panelId: circuit.panelId,
  });
  if (!parsed.success) {
    redirect(
      `/dashboard/circuits/${circuitId}/edit?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid",
      )}`,
    );
  }
  const d = parsed.data;
  await prisma.circuit.update({
    where: { id: circuitId },
    data: {
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
    },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "circuit.updated",
    entityType: "Circuit",
    entityId: circuitId,
    metadata: {},
  });
  redirect(`/dashboard/panels/${circuit.panelId}`);
}

export default async function EditCircuitPage({
  params,
  searchParams,
}: {
  params: { circuitId: string };
  searchParams: { error?: string };
}) {
  const user = await requireCurrentUser();
  const c = await prisma.circuit.findUnique({
    where: { id: params.circuitId },
    include: { panel: true },
  });
  if (!c) notFound();
  if (!(await canRecordOnProperty(user, c.panel.propertyId))) notFound();
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Edit circuit #{c.circuitNumber}</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="circuitId" value={c.id} />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="circuitNumber">Slot #</label>
            <input id="circuitNumber" name="circuitNumber" type="number" min={1} required defaultValue={c.circuitNumber} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="breakerAmperage">Amps</label>
            <input id="breakerAmperage" name="breakerAmperage" type="number" defaultValue={c.breakerAmperage ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="breakerPoleCount">Poles</label>
            <select id="breakerPoleCount" name="breakerPoleCount" className="select" defaultValue={c.breakerPoleCount ?? 1}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="label">Label</label>
          <input id="label" name="label" defaultValue={c.label ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="areaServed">Area served</label>
          <input id="areaServed" name="areaServed" defaultValue={c.areaServed ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="loadType">Load type</label>
          <input id="loadType" name="loadType" defaultValue={c.loadType ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="protectionType">Protection</label>
          <select id="protectionType" name="protectionType" className="select" defaultValue={c.protectionType}>
            <option value="standard">Standard</option>
            <option value="afci">AFCI</option>
            <option value="gfci">GFCI</option>
            <option value="dfci">DFCI</option>
            <option value="cafci">CAFCI</option>
            <option value="dual_function">Dual function (AFCI+GFCI)</option>
          </select>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input name="isTandem" type="checkbox" value="true" defaultChecked={c.isTandem} /> Tandem breaker
        </label>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" className="textarea" defaultValue={c.notes ?? ""} rows={2} />
        </div>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </div>
  );
}
