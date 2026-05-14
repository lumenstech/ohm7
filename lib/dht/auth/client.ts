import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Singleton Auth0 client. Reads env vars:
 *   - AUTH0_DOMAIN          (or AUTH0_ISSUER_BASE_URL hostname)
 *   - AUTH0_CLIENT_ID
 *   - AUTH0_CLIENT_SECRET
 *   - AUTH0_SECRET          (cookie encryption — `openssl rand -hex 32`)
 *   - APP_BASE_URL          (e.g. http://localhost:3000)
 *
 * In SDK v4 the default route paths are `/auth/login`, `/auth/callback`,
 * `/auth/logout`, `/auth/profile`, etc. — handled by the middleware.
 */
export const auth0 = new Auth0Client({
  signInReturnToPath: "/dashboard",
});
