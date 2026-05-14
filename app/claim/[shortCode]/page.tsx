import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { normalizeShortCode } from "@/lib/short-code";
import { createClaimSchema } from "@/lib/dht/zod-schemas";
import { writeAudit } from "@/lib/dht/audit";
import { createPendingClaim } from "@/lib/dht/claims/pending";
import { rateLimit } from "@/lib/dht/rate-limit";
import { SafetyNotice } from "@/components/safety-notice";

async function submitClaim(formData: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for") ?? "anon";
  if (!(await rateLimit().check(`claim:${ip}`, 5, 60_000))) {
    redirect(
      `/claim/${formData.get("shortCode")}?error=${encodeURIComponent(
        "Too many attempts — try again in a minute",
      )}`,
    );
  }
  const parsed = createClaimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const code = formData.get("shortCode") ?? "";
    redirect(
      `/claim/${code}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid",
      )}`,
    );
  }
  const data = parsed.data;
  const code = normalizeShortCode(data.shortCode);
  const sc = await prisma.panelShortCode.findUnique({ where: { shortCode: code } });
  if (!sc) {
    redirect(`/claim/${code}?error=${encodeURIComponent("Unknown sticker")}`);
  }
  if (sc.status === "active") {
    redirect(
      `/claim/${code}?error=${encodeURIComponent(
        "This sticker is already linked to a property. Sign in or request access instead.",
      )}`,
    );
  }

  // Persist proof + email out-of-band; no User row is created here. The
  // Auth0 callback consumes the token and finishes the bind.
  const { token } = await createPendingClaim({
    shortCode: code,
    email: data.claimantEmail || "",
    proofData: {
      address: data.submittedAddress,
      city: data.submittedCity || null,
      state: data.submittedState || null,
      zip: data.submittedZip || null,
      unitNumber: data.unitNumber || null,
      claimantName: data.claimantName,
      claimantPhone: data.claimantPhone,
    },
  });

  await writeAudit({
    action: "claim.pending_created",
    entityType: "PendingClaim",
    metadata: { shortCode: code },
  });

  // Hand the user off to Auth0 sign-up. The callback handler picks up the
  // pending claim token via `returnTo` and finalises the property bind.
  const returnTo = `/claim/${code}/finalize?token=${encodeURIComponent(token)}`;
  const params = new URLSearchParams({
    screen_hint: "signup",
    returnTo,
  });
  if (data.claimantEmail) params.set("login_hint", data.claimantEmail);
  redirect(`/auth/login?${params.toString()}`);
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: { shortCode: string };
  searchParams: { error?: string };
}) {
  const code = normalizeShortCode(params.shortCode);
  const sc = await prisma.panelShortCode.findUnique({ where: { shortCode: code } });
  if (!sc) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Claim this property</h1>
        <p className="mt-1 text-sm text-ink-600">
          You're claiming sticker <span className="font-mono">{code}</span>. After you submit, we
          hand you off to our sign-in to verify your email. No trade can claim a property without
          owner verification.
        </p>
      </header>
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}
      <form action={submitClaim} className="space-y-4">
        <input type="hidden" name="shortCode" value={code} />
        <div>
          <label className="label" htmlFor="claimantName">Your name</label>
          <input id="claimantName" name="claimantName" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="claimantPhone">Mobile number</label>
          <input id="claimantPhone" name="claimantPhone" required className="input" inputMode="tel" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="claimantEmail">Email (will be used for sign-in)</label>
          <input id="claimantEmail" name="claimantEmail" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="submittedAddress">Property address</label>
          <input id="submittedAddress" name="submittedAddress" required className="input" autoComplete="street-address" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label" htmlFor="submittedCity">City</label>
            <input id="submittedCity" name="submittedCity" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="submittedState">State</label>
            <input id="submittedState" name="submittedState" className="input" maxLength={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="submittedZip">ZIP</label>
            <input id="submittedZip" name="submittedZip" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="unitNumber">Unit # (if multi-family)</label>
            <input id="unitNumber" name="unitNumber" className="input" />
          </div>
        </div>
        <button className="btn-primary w-full" type="submit">
          Continue to sign-in
        </button>
      </form>
      <p className="text-xs text-ink-500">
        Already have an account? <Link className="text-bolt-700" href="/auth/login">Sign in first</Link>{" "}
        so this property attaches to your dashboard.
      </p>
      <SafetyNotice />
    </div>
  );
}
