import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { User, UserRole } from "@prisma/client";

const SESSION_COOKIE = "ohm7_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please-32-bytes";
  return new TextEncoder().encode(raw);
}

export type SessionPayload = {
  sub: string;
  role: UserRole;
  email: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function issueSession(user: Pick<User, "id" | "email" | "role">): Promise<string> {
  const jwt = await new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
  return jwt;
}

export async function setSessionCookie(user: Pick<User, "id" | "email" | "role">) {
  const token = await issueSession(user);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const c = cookies().get(SESSION_COOKIE);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, getSecret());
    if (!payload.sub || !payload.role || !payload.email) return null;
    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const s = await getSessionPayload();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.sub } });
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("unauthorized");
  return u;
}

export async function requireRole(roles: UserRole[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("forbidden");
  return u;
}
