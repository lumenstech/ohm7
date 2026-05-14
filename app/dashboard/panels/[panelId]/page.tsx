import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canAccessProperty, canRecordOnProperty } from "@/lib/dht/permissions";
import { evaluateRecallRules } from "@/lib/dht/recall-rules";
import { evaluatePanel } from "@/lib/dht/compliance-rules";
import { FlagBadge } from "@/components/flag-badge";

export const dynamic = "force-dynamic";

export default async function PanelDetailPage({ params }: { params: { panelId: string } }) {
  const user = await requireCurrentUser();
  const panel = await prisma.panel.findUnique({
    where: { id: params.panelId },
    include: {
      property: { include: { jurisdiction: true } },
      circuits: { orderBy: { circuitNumber: "asc" } },
      shortCodes: true,
    },
  });
  if (!panel) notFound();
  if (!(await canAccessProperty(user, panel.propertyId))) notFound();
  const canManage = await canRecordOnProperty(user, panel.propertyId);

  const recallFlags = evaluateRecallRules({
    manufacturer: panel.manufacturer,
    panelLine: panel.panelLine,
    modelNumber: panel.modelNumber,
  });
  const complianceFlags = evaluatePanel(panel.circuits, panel.property.jurisdiction);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <Link className="text-sm text-bolt-700" href={`/dashboard/properties/${panel.propertyId}`}>
            ← {panel.property.nickname ?? panel.property.addressLine1}
          </Link>
          <h1 className="text-2xl font-semibold">{panel.nickname ?? "Panel"}</h1>
          <p className="text-sm text-ink-500">
            {[panel.manufacturer, panel.panelLine, panel.modelNumber].filter(Boolean).join(" · ")}
            {panel.mainBreakerAmps ? ` · ${panel.mainBreakerAmps}A main` : ""}
            {panel.voltage ? ` · ${panel.voltage}` : ""}
          </p>
        </div>
        {canManage && (
          <Link href={`/dashboard/panels/${panel.id}/circuits/new`} className="btn-primary">+ Add circuit</Link>
        )}
      </header>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">QR sticker codes</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {panel.shortCodes.map((c) => (
            <li key={c.id}>
              <code className="font-mono">{c.shortCode}</code>{" "}
              <span className="text-ink-500">· {c.status} · {c.locationLabel ?? "(no label)"}</span>{" "}
              <Link className="text-bolt-700" href={`/p/${c.shortCode}`}>open</Link>
            </li>
          ))}
        </ul>
      </section>

      {(recallFlags.length > 0 || complianceFlags.length > 0) && (
        <section className="card-pad space-y-3">
          <h2 className="text-lg font-semibold">Overlay flags</h2>
          {recallFlags.map((f) => (
            <div key={f.code} className="rounded-md border border-ink-100 p-3 text-sm">
              <div className="flex items-center gap-2">
                <FlagBadge severity={f.severity}>{f.severity}</FlagBadge>
                <strong>{f.title}</strong>
              </div>
              <div className="mt-1 text-ink-600">{f.detail}</div>
              <div className="mt-1 text-ink-500 text-xs">→ {f.recommendation}</div>
            </div>
          ))}
          {complianceFlags.map((f, i) => (
            <div key={`${f.code}-${i}`} className="rounded-md border border-ink-100 p-3 text-sm">
              <div className="flex items-center gap-2">
                <FlagBadge severity={f.severity}>{f.severity}</FlagBadge>
                <strong>{f.title}</strong>
                {f.reference && <span className="text-xs text-ink-500">({f.reference})</span>}
              </div>
              <div className="mt-1 text-ink-600">{f.detail}</div>
              <div className="mt-1 text-ink-500 text-xs">→ {f.recommendation}</div>
            </div>
          ))}
          <p className="text-xs text-ink-500">
            Overlay is a heuristic — always verify with the AHJ and a licensed professional.
          </p>
        </section>
      )}

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Circuits ({panel.circuits.length})</h2>
        {panel.circuits.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No circuits yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500">
                <th className="py-2 w-12">#</th>
                <th>Label</th>
                <th>Area</th>
                <th>Amps</th>
                <th>Protection</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {panel.circuits.map((c) => (
                <tr key={c.id} className="border-t border-ink-100">
                  <td className="py-2 font-mono">{c.circuitNumber}</td>
                  <td>{c.label || "—"}</td>
                  <td>{c.areaServed || "—"}</td>
                  <td>{c.breakerAmperage ?? "—"}</td>
                  <td>{c.protectionType}</td>
                  <td className="text-right">
                    <Link href={`/dashboard/circuits/${c.id}/edit`} className="text-xs text-bolt-700">edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
