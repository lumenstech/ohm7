import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dht/auth/current-user";

export const dynamic = "force-dynamic";

// Admin-side surface for stalled / unconsumed PendingClaim rows. In v0.3.1
// the claim flow finalises through Auth0 callback rather than an admin
// override — there is no longer a "manually verify with a fake password"
// path. If an owner never finished sign-up we surface the proof here so an
// admin can reach out manually.
export default async function ManualClaimsPage() {
  await requireRole(["admin"]);
  const claims = await prisma.pendingClaim.findMany({
    where: { consumedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin · pending claims</h1>
      <p className="text-sm text-ink-500">
        Unconsumed claim tokens. The owner needs to finish Auth0 sign-up at the same email to
        finalize. Admins should not "manually verify" — they should contact the owner directly and
        send them a fresh claim link.
      </p>
      {claims.length === 0 ? (
        <p className="text-sm text-ink-500">No pending claims.</p>
      ) : (
        <ul className="space-y-3">
          {claims.map((c) => {
            const proof = c.proofData as Record<string, unknown> | null;
            const expired = c.expiresAt.getTime() < Date.now();
            return (
              <li key={c.id} className="card-pad">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="font-medium">{String(proof?.claimantName ?? "(unknown)")}</div>
                    <div className="text-xs text-ink-500 break-all">
                      {String(proof?.address ?? "")} · {c.email} · sticker {c.shortCode}
                    </div>
                    <div className="text-xs text-ink-500">
                      Created {c.createdAt.toLocaleString()} ·{" "}
                      Expires {c.expiresAt.toLocaleString()}{" "}
                      {expired ? "(expired)" : null}
                    </div>
                  </div>
                  <span className={expired ? "badge-danger" : "badge-warn"}>
                    {expired ? "expired" : "pending"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
