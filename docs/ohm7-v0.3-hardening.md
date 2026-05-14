# ohm7 — v0.3 hardening

> **Superseded by `docs/dht-v0.3.1-realignment.md`.** The v0.3 doc below is
> kept verbatim for history. The product was renamed to ServiceFixes DHT
> in v0.3.1, the WhatsApp/SMS provider was split into a BSP layer
> (`MessageProvider` = Dialog360 / Gupshup / Simulated / Disabled) and an
> approval-orchestration layer (`ApprovalOrchestrator` = SequenceNow /
> Disabled), Twilio was removed, and the homegrown email/password auth was
> replaced with Auth0.


Scope: NOT new features. This change set takes the v0.2 MVP from
"runs locally" to "safe enough to merge and deploy behind a feature flag".

## What changed

### Messaging provider — explicit modes (`lib/ohm7/provider.ts`)
- New env: `DHT_MESSAGE_PROVIDER` with `simulated | twilio | sequencenow | disabled`.
- Production refuses an unset provider value with `ProviderMisconfiguredError`.
- Production refuses `simulated` unless `DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true`.
- `TwilioProvider` and `SequenceNowProvider` validate env up-front; they
  throw a clear `ProviderMisconfiguredError` instead of silently faking
  success. The REST calls themselves are marked as a single explicit TODO.
- `DisabledProvider` answers `isLive()===false` and throws
  `ProviderUnavailableError` on send.
- Claim and access-request flows surface a clean
  "Messaging is currently unavailable" message when the provider can't send
  and audit the outcome.

### Rate limiter — explicit modes (`lib/ohm7/rate-limit.ts`)
- New env: `DHT_RATE_LIMIT_PROVIDER` with `memory | redis | disabled`.
- Production refuses an unset provider.
- Production refuses `memory` unless
  `DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true`.
- `RedisRateLimiter` validates `REDIS_URL` at construction and throws on
  send until the INCR/EXPIRE wire is implemented.
- Limits applied: `/claim/[code]`, `/claim/[code]/verify`,
  `/p/[code]/request-access`, `/login`, `/signup`.

### Tenant invite flow (new)
- New `TenantInvite` model with token/expiry/status.
- New `UnitTenantAccess` model — the *only* way a tenant can read a
  property or submit a service request.
- `canAccessProperty` for tenants now requires an active
  `UnitTenantAccess` row. The previous "tenant has at least one request"
  heuristic was a self-service trust hole and has been removed.
- Routes:
  - `/dashboard/properties/[id]/tenant-invites` — list / revoke.
  - `/dashboard/properties/[id]/tenant-invites/new` — create.
  - `/tenant/invite/[token]` — accept (signed-in tenant only).
- `/dashboard/tenant/service-requests/new` no longer trusts an arbitrary
  `propertyId`. The dropdown shows only properties the tenant has accepted
  access to, and the action handler re-checks `tenantHasAccess()`.
- All invite create / accept / revoke actions write `AuditEvent` rows.

### Real Prisma migration
- Schema is now applied via `prisma migrate` instead of `prisma db push`.
- Single consolidated initial migration at
  `prisma/migrations/<ts>_init/migration.sql`.
- New scripts: `pnpm prisma:migrate` (dev),
  `pnpm prisma:migrate:deploy` (prod).
- `package.json` declares `prisma.seed` so `prisma db seed` works.

### Jurisdiction seeds
- 9 state-level + 1 municipal (NYC) jurisdictions seeded with
  `necEdition`, `necEditionYear`, `ahjUrl`, and short notes.
- Extracted to `prisma/seed-jurisdictions.ts` so other scripts (e.g. a
  future production-import path) can reuse it.

### Audit lock-down tests
- Scan redaction now blocks owner phone/email/full name, full street
  address, parcel id, panel manufacturer/model/serial/install year/notes,
  unit occupancy details, tenant info, service-event notes, and
  access-grant data. Whitelist on the public view object asserted.
- New integration tests for tenant access boundary (skipped when
  `DATABASE_URL` is unset) and grant approval boundary covering trade
  self-approval, tenant approval, unrelated owner approval, denied/
  revoked/expired grants.

## Why each change

- Silent simulated provider in production was the highest-severity issue
  found in the inspection. Production codes would have been logged to
  stdout. Fixed by failing loud at boot.
- Process-local rate limiter is wrong for any multi-instance deployment;
  the explicit mode + escape hatch makes the wrong path obvious.
- Tenants previously self-asserted access by picking any `propertyId` in a
  select — the invite flow closes that. Removing the "tenant inferred
  from a service request" rule also closes the implicit-grant loop where
  creating a request would itself grant read.
- Real migration files are mandatory for production deploys via
  `prisma migrate deploy`.

## Production-readiness notes

- Real Twilio / SequenceNow REST calls are *not* wired. Both providers
  fail loud — no fake success — so a misconfigured prod will refuse to
  send instead of pretending.
- The Redis limiter is the same: configured, validated, but the actual
  INCR/EXPIRE remains a TODO. Use `disabled` (with caution) or wire
  Redis before production.
- The owner-shell created during claim verification still uses a random
  password. Add a magic-link or password-set flow before opening claims
  to anonymous owners at scale.

## Remaining blockers (not fixed in v0.3)

- No real provider implementation (Twilio / SequenceNow REST).
- No Redis limiter implementation.
- No magic-link / password-set flow for owner shells.
- No photo storage.
- No InvoiceChats coupling (Phase 3 — intentionally deferred).
- No billing.
