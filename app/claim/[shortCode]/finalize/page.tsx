import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/dht/auth/current-user";
import { consumePendingClaim, findPendingClaimByToken } from "@/lib/dht/claims/pending";
import { writeAudit } from "@/lib/dht/audit";

// This page runs after the Auth0 callback when the user came from a pending
// claim. It consumes the token and binds the property.
export default async function FinalizeClaimPage({
  params,
  searchParams,
}: {
  params: { shortCode: string };
  searchParams: { token?: string };
}) {
  const user = await requireCurrentUser(`/claim/${params.shortCode}/finalize?token=${searchParams.token ?? ""}`);
  const token = searchParams.token;
  if (!token) redirect("/dashboard");

  const claim = await findPendingClaimByToken(token);
  if (!claim) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">Claim link invalid</h1>
        <p className="text-sm text-ink-600">This claim link isn't recognised or has expired.</p>
      </div>
    );
  }

  // Guard: only the email that started the claim may consume it.
  if (claim.email && claim.email.toLowerCase() !== user.email.toLowerCase()) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">Email mismatch</h1>
        <p className="text-sm text-ink-600">
          This claim was started with a different email address. Sign out and complete the claim
          using the same email you submitted on the claim form.
        </p>
      </div>
    );
  }

  const result = await consumePendingClaim(token, user.id);
  if (!result) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">Could not finalize</h1>
        <p className="text-sm text-ink-600">
          The claim link has expired, been consumed already, or the sticker is now bound to another
          property. Contact support if this is wrong.
        </p>
      </div>
    );
  }

  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "claim.pending_consumed",
    entityType: "PendingClaim",
    entityId: claim.id,
    metadata: { propertyId: result.propertyId, shortCode: claim.shortCode },
  });

  redirect(`/dashboard/properties/${result.propertyId}?welcome=1`);
}
