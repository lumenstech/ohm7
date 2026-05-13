import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { loginSchema } from "@/lib/ohm7/zod-schemas";

export const metadata = { title: "Sign in — ohm7" };

async function action(formData: FormData) {
  "use server";
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/login?error=${encodeURIComponent("Invalid input")}`);
  const { email, password } = parsed.data;
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("Invalid email or password")}`);
  }
  await setSessionCookie(u);
  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const u = await getCurrentUser();
  if (u) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-ink-600">New here? <Link href="/signup" className="text-bolt-700">Create an account</Link>.</p>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
        </div>
        <button className="btn-primary w-full" type="submit">Sign in</button>
      </form>
    </div>
  );
}
