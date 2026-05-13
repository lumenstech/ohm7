# ohm7

Property-bound electrical panel records, owner-approved access, and service
history. MVP scope based on the v0.2 design doc.

## Quick start

```bash
pnpm install                              # install deps
cp .env.example .env                      # set DATABASE_URL + AUTH_SECRET
pnpm prisma:generate
pnpm prisma:push                          # create the schema in Postgres
pnpm db:seed                              # demo users, jurisdictions, panels
pnpm dev                                  # http://localhost:3000
```

Demo logins (after seed): `owner@example.com` / `admin@example.com` —
password `password123`.

Demo scan codes:
- `/p/DEMOACTIVE` — an active sticker on a Square D QO panel.
- `/p/DEMO000001` — an unassigned sticker (run the claim flow).

## What's implemented

- Next.js App Router + TypeScript + Tailwind + Prisma + Postgres + Zod
- Email / password auth with JWT cookie (`jose`) and bcrypt
- Roles: `owner`, `trade`, `tenant`, `admin`
- Public scan view `/p/[shortCode]` with redaction
- Property claim flow `/claim/[shortCode]` → 6-digit WhatsApp/SMS verification
- Access-request flow `/p/[shortCode]/request-access` (never auto-claims)
- Dashboard: properties, panels, circuits, service events, access grants
- Tenant: service-request submit + list (cannot grant access)
- Admin: manual override of stalled claims (audited)
- Compliance overlay (`lib/ohm7/compliance-rules.ts`) and recall flags
  (`lib/ohm7/recall-rules.ts`) with unit tests
- Audit log on every important action
- Simulated WhatsApp/SMS provider (logs to console; Twilio TODO marked)
- Marketing pages: `/`, `/pricing`, `/for-landlords`, `/for-trades`,
  `/for-tenants`, `/safety`
- Pricing config is config-driven (`lib/ohm7/pricing.ts`)

## Docs

See `docs/`:

- `ohm7-mvp.md` — feature inventory
- `ohm7-architecture.md` — stack + data flow
- `ohm7-permissions.md` — role matrix
- `ohm7-claim-flow.md` — owner verification details
- `ohm7-compliance-overlay.md` — rules engine notes + disclaimers
- `ohm7-open-questions.md` — unresolved items carried from v0.2

## Verification

```bash
pnpm prisma:generate
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
