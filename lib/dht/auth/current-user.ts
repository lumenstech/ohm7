import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth0 } from "./client";
import { upsertUserFromSession } from "./session-handler";
import type { User, UserRole } from "@prisma/client";

/**
 * Returns the User row for the currently authenticated Auth0 session, or
 * null if anonymous. Idempotently provisions the row on first sign-in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;
  const auth0Sub = session.user.sub as string;
  const existing = await prisma.user.findUnique({ where: { auth0Sub } });
  if (existing) return existing;
  // First-time arrival from Auth0 (no `beforeSessionSaved` hook ran yet because
  // the user hit a page directly after callback). Provision the row now.
  return upsertUserFromSession(session);
}

/**
 * Same as {@link getCurrentUser}, but redirects to the Auth0 login route
 * when the session is missing. For use in pages and server actions that
 * require auth.
 */
export async function requireCurrentUser(returnTo?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/auth/login${next}`);
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await requireCurrentUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
