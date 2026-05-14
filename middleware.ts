import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/dht/auth/client";

// In Auth0 SDK v4, the middleware mounts the SDK routes (/auth/login,
// /auth/callback, /auth/logout, etc.) AND can guard protected paths.
//
// Authenticated route protection here is intentionally minimal — pages
// themselves call `requireCurrentUser()` for an explicit redirect. We keep
// the middleware so the SDK's route handlers actually run.
export async function middleware(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  // Match all routes except:
  //   - the public scan + claim flow (anonymous-friendly)
  //   - Next.js internals + static assets + favicons
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|images|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
