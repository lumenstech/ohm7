import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageProperty } from "@/lib/ohm7/permissions";
import { createPanelSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";
import { evaluateRecallRules } from "@/lib/ohm7/recall-rules";
import { generateShortCode } from "@/lib/short-code";

async function action(formData: FormData) {
  "use server";
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!(await canManageProperty(user, propertyId))) {
    redirect(`/dashboard/properties/${propertyId}?error=${encodeURIComponent("Not allowed")}`);
  }
  const parsed = createPanelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/dashboard/properties/${propertyId}/panels/new?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid",
      )}`,
    );
  }
  const d = parsed.data;
  const recallFlags = evaluateRecallRules({
    manufacturer: d.manufacturer,
    panelLine: d.panelLine,
    modelNumber: d.modelNumber,
  });
  const highest = recallFlags[0];

  const panel = await prisma.panel.create({
    data: {
      propertyId,
      nickname: d.nickname || null,
      locationDescription: d.locationDescription || null,
      manufacturer: d.manufacturer || null,
      panelLine: d.panelLine || null,
      modelNumber: d.modelNumber || null,
      serialNumber: d.serialNumber || null,
      busRatingAmps: d.busRatingAmps ?? null,
      mainBreakerAmps: d.mainBreakerAmps ?? null,
      voltage: d.voltage || null,
      phase: d.phase,
      numSpaces: d.numSpaces ?? null,
      installationYear: d.installationYear ?? null,
      conditionNotes: d.conditionNotes || null,
      stickerPlacement: d.stickerPlacement,
      recallFlag: !!highest && highest.severity !== "info",
      recallReason: highest?.title ?? null,
    },
  });

  // Auto-mint a sticker shortcode for this panel.
  const shortCode = await mintUniqueShortCode();
  await prisma.panelShortCode.create({
    data: {
      shortCode,
      panelId: panel.id,
      propertyId,
      status: "active",
      activatedAt: new Date(),
      activatedByUserId: user.id,
      locationLabel: d.locationDescription || null,
    },
  });

  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "panel.created",
    entityType: "Panel",
    entityId: panel.id,
    metadata: { propertyId, recallFlag: panel.recallFlag, shortCode },
  });

  redirect(`/dashboard/panels/${panel.id}`);
}

async function mintUniqueShortCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const c = generateShortCode();
    const exists = await prisma.panelShortCode.findUnique({ where: { shortCode: c } });
    if (!exists) return c;
  }
  throw new Error("Could not mint a unique short code after 5 attempts");
}

export default async function NewPanelPage({
  params,
  searchParams,
}: {
  params: { propertyId: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  if (!(await canManageProperty(user, params.propertyId))) notFound();
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Add a panel</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="propertyId" value={params.propertyId} />
        <div>
          <label className="label" htmlFor="nickname">Nickname</label>
          <input id="nickname" name="nickname" className="input" placeholder="Main panel" />
        </div>
        <div>
          <label className="label" htmlFor="locationDescription">Location description</label>
          <input id="locationDescription" name="locationDescription" className="input" placeholder="Basement, north wall" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="manufacturer">Manufacturer</label>
            <input id="manufacturer" name="manufacturer" className="input" placeholder="Square D" />
          </div>
          <div>
            <label className="label" htmlFor="panelLine">Line</label>
            <input id="panelLine" name="panelLine" className="input" placeholder="QO / Homeline" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="modelNumber">Model #</label>
            <input id="modelNumber" name="modelNumber" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="serialNumber">Serial #</label>
            <input id="serialNumber" name="serialNumber" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="busRatingAmps">Bus rating (A)</label>
            <input id="busRatingAmps" name="busRatingAmps" type="number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="mainBreakerAmps">Main breaker (A)</label>
            <input id="mainBreakerAmps" name="mainBreakerAmps" type="number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="numSpaces">Spaces</label>
            <input id="numSpaces" name="numSpaces" type="number" className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="voltage">Voltage</label>
            <input id="voltage" name="voltage" className="input" placeholder="120/240" />
          </div>
          <div>
            <label className="label" htmlFor="phase">Phase</label>
            <select id="phase" name="phase" className="select" defaultValue="single_phase">
              <option value="single_phase">Single phase</option>
              <option value="split_phase">Split phase</option>
              <option value="three_phase">Three phase</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="installationYear">Install year (approx)</label>
            <input id="installationYear" name="installationYear" type="number" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="stickerPlacement">Sticker placement</label>
            <select id="stickerPlacement" name="stickerPlacement" className="select" defaultValue="unknown">
              <option value="outside_cover">Outside cover</option>
              <option value="deadfront">Deadfront</option>
              <option value="inside_panel">Inside panel</option>
              <option value="unknown">Unknown / pending</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="conditionNotes">Condition notes</label>
          <textarea id="conditionNotes" name="conditionNotes" className="textarea" rows={3} />
        </div>
        <button className="btn-primary" type="submit">Create panel</button>
      </form>
    </div>
  );
}
