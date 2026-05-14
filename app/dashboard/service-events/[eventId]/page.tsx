import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canAccessProperty } from "@/lib/dht/permissions";

export const dynamic = "force-dynamic";

export default async function ServiceEventDetailPage({ params }: { params: { eventId: string } }) {
  const user = await requireCurrentUser();
  const e = await prisma.serviceEvent.findUnique({
    where: { id: params.eventId },
    include: { property: true, panel: true, circuit: true, performedBy: true },
  });
  if (!e) notFound();
  if (!(await canAccessProperty(user, e.propertyId))) notFound();
  const refs = Array.isArray(e.necSectionReferenced) ? e.necSectionReferenced as string[] : [];

  return (
    <div className="space-y-4 max-w-2xl">
      <Link href={`/dashboard/properties/${e.propertyId}`} className="text-sm text-bolt-700">
        ← {e.property.nickname ?? e.property.addressLine1}
      </Link>
      <h1 className="text-2xl font-semibold">{e.summary}</h1>
      <div className="text-sm text-ink-500">
        {e.trade} · {e.eventType} · {new Date(e.createdAt).toLocaleString()}{" "}
        {e.performedBy && <>· by {e.performedBy.fullName ?? e.performedBy.email}</>}
      </div>
      {e.panel && (
        <div className="text-sm">
          Panel: <Link className="text-bolt-700" href={`/dashboard/panels/${e.panel.id}`}>{e.panel.nickname ?? "panel"}</Link>
        </div>
      )}
      {e.notes && <p className="whitespace-pre-wrap rounded-lg bg-white p-4 border border-ink-200">{e.notes}</p>}
      {refs.length > 0 && (
        <div className="text-sm">
          NEC section(s) referenced:{" "}
          {refs.map((r) => (
            <code key={r} className="font-mono mr-2 inline-block rounded bg-ink-50 px-1.5 py-0.5">{r}</code>
          ))}
        </div>
      )}
      {e.invoiceReference && (
        <div className="text-sm">Invoice reference: <code className="font-mono">{e.invoiceReference}</code></div>
      )}
      <div className="text-xs text-ink-500">Source: {e.source}</div>
    </div>
  );
}
