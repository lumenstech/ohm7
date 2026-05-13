import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { signupSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";
import { rateLimit } from "@/lib/ohm7/rate-limit";

export const metadata = { title: "Sign up — ohm7" };

async function action(formData: FormData) {
  "use server";
  const ip = headers().get("x-forwarded-for") ?? "anon";
  if (!(await rateLimit().check(`signup:${ip}`, 5, 60_000))) {
    redirect(`/signup?error=${encodeURIComponent("Too many attempts — try again in a minute")}`);
  }
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input");
    redirect(`/signup?error=${msg}`);
  }
  const { email, password, fullName, role, phone, company } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("Email already registered")}`);
  }
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      fullName: fullName || null,
      role,
      phone: phone || null,
      company: company || null,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "user.signup",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role },
  });
  await setSessionCookie(user);
  redirect("/dashboard");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; role?: string };
}) {
  const u = await getCurrentUser();
  if (u) redirect("/dashboard");
  const error = searchParams.error;
  const defaultRole = searchParams.role === "trade" || searchParams.role === "tenant" ? searchParams.role : "owner";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Create your ohm7 account</h1>
      <p className="mt-1 text-sm text-ink-600">Already have one? <Link href="/login" className="text-bolt-700">Sign in</Link>.</p>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="role">I am a…</label>
          <select id="role" name="role" defaultValue={defaultRole} className="select">
            <option value="owner">Property owner / landlord</option>
            <option value="trade">Trade / contractor</option>
            <option value="tenant">Tenant / renter</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="company">Company (trades only)</label>
          <input id="company" name="company" className="input" autoComplete="organization" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile (for WhatsApp/SMS)</label>
          <input id="phone" name="phone" className="input" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (8+ chars)</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <button className="btn-primary w-full" type="submit">Create account</button>
      </form>
    </div>
  );
}
