import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { normalizeShortCode } from "@/lib/short-code";
import { verifyClaimSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";
import { rateLimit } from "@/lib/ohm7/rate-limit";
import { hashPassword, setSessionCookie, getCurrentUser } from "@/lib/auth";

async function verifyClaim(formData: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for") ?? "anon";
  const claimIdRaw = String(formData.get("claimId") ?? "");
  // Strict bucket: at most 10 verification attempts per claim per 5 min.
  if (!(await rateLimit().check(`claim-verify:${claimIdRaw}:${ip}`, 10, 5 * 60_000))) {
    redirect(`/claim/${formData.get("shortCode")}/verify?claimId=${claimIdRaw}&error=${encodeURIComponent("Too many attempts — try again later")}`);
  }
  const parsed = verifyClaimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/claim/${formData.get("shortCode")}/verify?claimId=${claimIdRaw}&error=${encodeURIComponent("Enter the 6-digit code")}`);
  }
  const { claimId, code } = parsed.data;
  const claim = await prisma.propertyClaim.findUnique({
    where: { id: claimId },
    include: { shortCode: true },
  });
  if (!claim) redirect("/");
  if (claim.verificationStatus !== "sent") {
    redirect(`/claim/${claim.shortCode?.shortCode ?? ""}/verify?claimId=${claim.id}&error=${encodeURIComponent("This claim is no longer awaiting verification")}`);
  }
  if (claim.verificationCode !== code) {
    redirect(`/claim/${claim.shortCode?.shortCode ?? ""}/verify?claimId=${claim.id}&error=${encodeURIComponent("Incorrect code")}`);
  }

  // Ensure an owner User exists. If logged in, use that user. Otherwise create
  // a passwordless-pending owner record we can attach when they sign up.
  let user = await getCurrentUser();
  if (!user) {
    const placeholderPassword = await hashPassword(`pending-${crypto.randomUUID()}`);
    const email =
      claim.claimantEmail ?? `pending+${claim.id}@ohm7.local`;
    const existing = await prisma.user.findUnique({ where: { email } });
    user =
      existing ??
      (await prisma.user.create({
        data: {
          email,
          passwordHash: placeholderPassword,
          fullName: claim.claimantName,
          phone: claim.claimantPhone,
          role: "owner",
        },
      }));
    await setSessionCookie(user);
  }

  const property = await prisma.property.create({
    data: {
      addressLine1: claim.submittedAddress,
      city: claim.submittedCity,
      state: claim.submittedState,
      zip: claim.submittedZip,
      ownerUserId: user.id,
    },
  });

  await prisma.panelShortCode.update({
    where: { id: claim.shortCodeId! },
    data: {
      propertyId: property.id,
      status: "active",
      activatedAt: new Date(),
      activatedByUserId: user.id,
    },
  });

  await prisma.propertyClaim.update({
    where: { id: claim.id },
    data: {
      verificationStatus: "verified",
      ownerVerifiedAt: new Date(),
      propertyId: property.id,
      claimantUserId: user.id,
    },
  });

  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "claim.verified",
    entityType: "PropertyClaim",
    entityId: claim.id,
    metadata: { propertyId: property.id },
  });

  redirect(`/dashboard/properties/${property.id}?welcome=1`);
}

async function markStalled(formData: FormData) {
  "use server";
  const claimId = String(formData.get("claimId") ?? "");
  const c = await prisma.propertyClaim.update({
    where: { id: claimId },
    data: { verificationStatus: "stalled" },
  });
  await writeAudit({
    action: "claim.stalled",
    entityType: "PropertyClaim",
    entityId: c.id,
    metadata: {},
  });
  redirect(`/claim/stalled`);
}

export default async function VerifyClaimPage({
  params,
  searchParams,
}: {
  params: { shortCode: string };
  searchParams: { claimId?: string; error?: string };
}) {
  const code = normalizeShortCode(params.shortCode);
  const claimId = searchParams.claimId;
  if (!claimId) notFound();
  const claim = await prisma.propertyClaim.findUnique({ where: { id: claimId } });
  if (!claim) notFound();

  const devCodeHint = !process.env.WHATSAPP_PROVIDER && claim.verificationCode
    ? `Dev hint: the simulated provider logged code ${claim.verificationCode} to the server console.`
    : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Confirm your number</h1>
      <p className="text-sm text-ink-600">
        We sent a 6-digit code to <span className="font-mono">{claim.claimantPhone}</span>.
      </p>
      {devCodeHint && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{devCodeHint}</div>
      )}
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={verifyClaim} className="space-y-4">
        <input type="hidden" name="shortCode" value={code} />
        <input type="hidden" name="claimId" value={claim.id} />
        <div>
          <label className="label" htmlFor="code">Verification code</label>
          <input id="code" name="code" required pattern="[0-9]{6}" className="input font-mono text-lg tracking-widest" inputMode="numeric" />
        </div>
        <button className="btn-primary w-full" type="submit">Verify &amp; claim property</button>
      </form>
      <form action={markStalled}>
        <input type="hidden" name="claimId" value={claim.id} />
        <button type="submit" className="text-sm text-ink-500 underline">
          Didn't get the code? Mark this claim as stalled — an admin can reach out manually.
        </button>
      </form>
    </div>
  );
}
