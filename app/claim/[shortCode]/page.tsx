import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeShortCode } from "@/lib/short-code";
import { createClaimSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";
import {
  generateVerificationCode,
  getProvider,
  ProviderMisconfiguredError,
  ProviderUnavailableError,
} from "@/lib/ohm7/provider";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ohm7/rate-limit";
import { headers } from "next/headers";
import { SafetyNotice } from "@/components/safety-notice";

async function submitClaim(formData: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for") ?? "anon";
  if (!(await rateLimit().check(`claim:${ip}`, 5, 60_000))) {
    redirect(`/claim/${formData.get("shortCode")}?error=${encodeURIComponent("Too many attempts — try again in a minute")}`);
  }
  const parsed = createClaimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const code = formData.get("shortCode") ?? "";
    redirect(`/claim/${code}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const data = parsed.data;
  const code = normalizeShortCode(data.shortCode);
  const sc = await prisma.panelShortCode.findUnique({ where: { shortCode: code } });
  if (!sc) redirect(`/claim/${code}?error=${encodeURIComponent("Unknown sticker")}`);
  if (sc.status === "active") {
    redirect(`/claim/${code}?error=${encodeURIComponent("This sticker is already linked to a property. Sign in or request access instead.")}`);
  }

  // Resolve the provider BEFORE writing any DB rows so we can surface a clean
  // "messaging unavailable" message without leaving stale claim rows behind.
  let provider;
  try {
    provider = getProvider();
  } catch (e) {
    if (e instanceof ProviderMisconfiguredError) {
      redirect(`/claim/${code}?error=${encodeURIComponent("Messaging is currently unavailable. Please contact support.")}`);
    }
    throw e;
  }
  if (!provider.isLive()) {
    redirect(`/claim/${code}?error=${encodeURIComponent("Messaging is currently unavailable. Please contact support.")}`);
  }

  const verificationCode = generateVerificationCode();
  const user = await getCurrentUser();
  const claim = await prisma.propertyClaim.create({
    data: {
      shortCodeId: sc.id,
      claimantUserId: user?.id ?? null,
      claimantName: data.claimantName,
      claimantPhone: data.claimantPhone,
      claimantEmail: data.claimantEmail || null,
      submittedAddress: data.submittedAddress,
      submittedCity: data.submittedCity || null,
      submittedState: data.submittedState || null,
      submittedZip: data.submittedZip || null,
      unitNumber: data.unitNumber || null,
      verificationStatus: "sent",
      verificationChannel: provider.name === "simulated" ? "simulated" : data.channel,
      verificationCode,
      verificationSentAt: new Date(),
    },
  });

  try {
    await provider.sendVerification({
      channel: data.channel,
      toPhone: data.claimantPhone,
      code: verificationCode,
      context: `ohm7 property claim for ${data.submittedAddress}`,
    });
  } catch (e) {
    // Roll the claim into a failed state instead of leaving it as "sent".
    await prisma.propertyClaim.update({
      where: { id: claim.id },
      data: { verificationStatus: "failed", notes: e instanceof Error ? e.message : "send failed" },
    });
    if (e instanceof ProviderUnavailableError || e instanceof ProviderMisconfiguredError) {
      redirect(`/claim/${code}?error=${encodeURIComponent("Messaging is currently unavailable. Please contact support.")}`);
    }
    throw e;
  }

  await writeAudit({
    actorUserId: user?.id ?? null,
    actorRole: user?.role ?? null,
    action: "claim.started",
    entityType: "PropertyClaim",
    entityId: claim.id,
    metadata: { shortCode: code, channel: data.channel },
  });

  redirect(`/claim/${code}/verify?claimId=${claim.id}`);
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
        <h1 className="text-2xl font-semibold">Register this panel</h1>
        <p className="mt-1 text-sm text-ink-600">
          You're claiming sticker <span className="font-mono">{code}</span>. We will send a
          verification code to confirm you can receive messages at the number you provide. No trade
          can claim a property without owner verification.
        </p>
      </header>
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
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
          <p className="help">WhatsApp preferred. We'll send a 6-digit code.</p>
        </div>
        <div>
          <label className="label" htmlFor="claimantEmail">Email (optional)</label>
          <input id="claimantEmail" name="claimantEmail" type="email" className="input" autoComplete="email" />
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
        <div>
          <label className="label" htmlFor="channel">Send code via</label>
          <select id="channel" name="channel" className="select" defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </div>
        <button className="btn-primary w-full" type="submit">Send verification code</button>
      </form>
      <p className="text-xs text-ink-500">
        Already have an account? <Link className="text-bolt-700" href="/login">Sign in first</Link>{" "}
        so this property attaches to your dashboard.
      </p>
      <SafetyNotice />
    </div>
  );
}
