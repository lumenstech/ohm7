import type { SessionData } from "@auth0/nextjs-auth0/types";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

/**
 * Idempotently upserts a User row from an Auth0 session. The `sub` claim is
 * the unique identity — email may change on the Auth0 side, we keep it in
 * sync but never use it as the primary key.
 */
export async function upsertUserFromSession(session: SessionData): Promise<User> {
  const auth0Sub = session.user.sub as string;
  const email = (session.user.email as string | undefined) ?? `${auth0Sub}@no-email.invalid`;
  const fullName = (session.user.name as string | undefined) ?? null;
  return prisma.user.upsert({
    where: { auth0Sub },
    create: { auth0Sub, email, fullName },
    update: { email, fullName },
  });
}
