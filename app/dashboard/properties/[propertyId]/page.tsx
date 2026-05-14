import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { canAccessProperty, canManageProperty } from "@/lib/dht/permissions";
import { FlagBadge } from "@/components/flag-badge";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: { propertyId: string };
  searchParams: { welcome?: string };
}) {
  const user = await requireCurrentUser();
  if (!(await canAccessProperty(user, params.propertyId))) notFound();
  const canManage = await canManageProperty(user, params.propertyId);

  const property = await prisma.property.findUnique({
    where: { id: params.propertyId },
    include: {
      jurisdiction: true,
      units: true,
      panels: { orderBy: { createdAt: "asc" } },
      grants: { orderBy: { createdAt: "desc" }, take: 10 },
      serviceEvents: { orderBy: { createdAt: "desc" }, take: 10, include: { panel: true } },
      shortCodes: { where: { panelId: null } },
    },
  });
  if (!property) notFound();

  return (
    <div className="space-y-6">
      {searchParams.welcome && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Property claimed. The QR sticker is now bound to this property.
        </div>
      )}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{property.nickname ?? property.addressLine1}</h1>
          <p className="text-sm text-ink-500">
            {[property.addressLine1, property.city, property.state, property.zip].filter(Boolean).join(", ")}
            {property.jurisdiction ? ` · ${property.jurisdiction.name} (NEC ${property.jurisdiction.necEdition ?? "?"})` : null}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/dashboard/properties/${property.id}/tenant-invites`} className="btn-secondary">Tenants</Link>
            <Link href={`/dashboard/properties/${property.id}/panels/new`} className="btn-primary">+ Add panel</Link>
          </div>
        )}
      </header>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Panels ({property.panels.length})</h2>
        {property.panels.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No panels yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {property.panels.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <Link href={`/dashboard/panels/${p.id}`} className="font-medium">
                  {p.nickname ?? `Panel ${p.id.slice(0, 6)}`}
                </Link>
                <div className="flex gap-2 items-center text-xs text-ink-500">
                  {p.manufacturer ? <span>{p.manufacturer}</span> : null}
                  {p.mainBreakerAmps ? <span>{p.mainBreakerAmps}A</span> : null}
                  {p.recallFlag && <FlagBadge severity="high">Hazard</FlagBadge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Recent service events</h2>
        {property.serviceEvents.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No service events recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {property.serviceEvents.map((e) => (
              <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:gap-3">
                <div>
                  <Link href={`/dashboard/service-events/${e.id}`} className="font-medium">{e.summary}</Link>
                  <div className="text-xs text-ink-500">{e.eventType} · {e.trade}{e.panel ? ` · panel ${e.panel.nickname ?? e.panel.id.slice(0, 6)}` : ""}</div>
                </div>
                <div className="sm:ml-auto text-xs text-ink-500">{new Date(e.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link
            href={`/dashboard/service-events/new?propertyId=${property.id}`}
            className="btn-secondary"
          >
            + Add service event
          </Link>
        </div>
      </section>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Access grants</h2>
        {property.grants.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No grants yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {property.grants.map((g) => (
              <li key={g.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{g.requesterName}{g.requesterCompany ? ` · ${g.requesterCompany}` : ""}</div>
                  <div className="text-xs text-ink-500">via {g.createdVia} · {new Date(g.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={
                    g.status === "pending" ? "badge-warn" :
                    g.status === "approved" ? "badge-ok" :
                    g.status === "denied" || g.status === "revoked" ? "badge-danger" : "badge-muted"
                  }>{g.status}</span>
                  <Link href={`/dashboard/access-requests/${g.id}`} className="text-xs text-bolt-700">manage</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
