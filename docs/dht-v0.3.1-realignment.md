# ServiceFixes DHT — v0.3.1 realignment

Scope: this is not a feature change. v0.3 was the property-bound electrical
records MVP under the codename `ohm7`, with a homegrown auth, a single
WhatsApp/SMS provider enum that collapsed two different concerns, and a
Twilio-shaped path. v0.3.1 renames the product, swaps in Auth0, and splits
messaging into a BSP layer and an approval-orchestration layer.

## Naming

| Was | Now |
|---|---|
| `ohm7` | ServiceFixes Digital Home Twin (DHT) |
| `lib/ohm7/*` | `lib/dht/*` |
| `OHM7_*` env vars | `DHT_*` env vars |
| `name: "ohm7"` | `name: "servicefixes-dht"` |

## Messaging — split into two layers

v0.3 had a single `MessageProvider` enum with values
`simulated | twilio | sequencenow | disabled` — a category error that
conflated BSP delivery with approval workflow.

v0.3.1 splits it:

```
ApprovalOrchestrator  ←  workflow lifecycle (state, callback, expire)
  • SequenceNowOrchestrator
  • DisabledOrchestrator
        │ uses
        ▼
MessageProvider       ←  BSP delivery
  • Dialog360Provider  (primary)
  • GupshupProvider    (secondary)
  • SimulatedProvider  (dev/test, in-memory outbox)
  • DisabledProvider   (kill switch)
```

- `Twilio` is **removed** from the codebase. Not the BSP strategy.
- `WASender` is **not added**. Retired from SequenceNow per stack rules.
- The orchestrator owns the `ApprovalRequest` row and the callback contract;
  the BSP only knows how to deliver a template message.

## Auth0 replaces homegrown auth

- `User.passwordHash` removed; `User.auth0Sub` added (unique, indexed).
- `app/login/page.tsx`, `app/signup/page.tsx`, `app/api/auth/logout/route.ts`
  and `lib/auth.ts` deleted.
- New: `middleware.ts` mounts the SDK routes (`/auth/login`,
  `/auth/callback`, `/auth/logout`).
- `getCurrentUser()` / `requireCurrentUser()` / `requireRole()` live in
  `lib/dht/auth/current-user.ts` and read the Auth0 session.
- Rate limits on `/login` and `/signup` removed (Auth0 handles).
- Rate limits on `/claim/[code]`, `/claim/[code]/finalize`, and
  `/p/[code]/request-access` retained.

## Owner-shell claim flow

The v0.3 anon-claim flow created a `User` row with a random password before
the owner had ever signed in — a leak risk. v0.3.1 replaces it:

```
/p/{shortcode}                  → public scan view + "Claim" CTA
/claim/{shortcode}              → owner submits proof; persisted to PendingClaim
  └─→ /auth/login?screen_hint=signup&returnTo=/claim/{shortcode}/finalize?token=…
/claim/{shortcode}/finalize     → Auth0 callback finalises: consumes the token,
                                  creates Property, activates sticker
```

The bridge state is the new `PendingClaim` model. No `User` row exists until
the Auth0 sign-up completes. The 6-digit verification code is gone.

## Schema deltas

- New: `PendingClaim`, `ApprovalRequest`, enum `ApprovalStatus`.
- Modified: `User` — `passwordHash` removed, `auth0Sub` added.
- Removed: `PropertyClaim`, enums `ClaimStatus`, `VerificationChannel`.

Migrations:

- `prisma/migrations/20260513220719_init/` — preserved from v0.3.
- `prisma/migrations/20260514002140_realignment_v0_3_1/` — applies the
  schema deltas. Generated via `prisma migrate diff` and validated against
  a fresh shadow database.

## Tests

109 passing (15 files). New + reshaped:

- `tests/dht/provider.test.ts` (15) — covers Dialog360, Gupshup, Simulated,
  Disabled production guards, the explicit rejection of `twilio` as an
  unknown mode, and "no fake success" for unimplemented REST.
- `tests/dht/approval-orchestrator.test.ts` (11) — pure resolver tests +
  integration tests against Postgres covering callback resolution, spoofed
  phone rejection, expiry handling, unknown payload prefixes.
- `tests/dht/auth0-claim-flow.test.ts` (6) — token entropy, TTL, expired /
  consumed / unknown-token paths, sticker race protection.
- `tests/dht/rate-limit.test.ts` — env var rename only.

Existing tests (`scan-redaction`, `tenant-access-boundary`,
`grant-approval-boundary`, `tenant-invites`, `permissions`, `pricing`,
`compliance-rules`, `recall-rules`, `jurisdiction-seeds`,
`short-code`, `zod-schemas`) preserved; `passwordHash` references rewritten
to `auth0Sub` to match the new schema.

## Production-readiness — open

- Dialog360 REST call (lib/dht/provider/dialog360.ts) is TODO.
- Gupshup REST call (lib/dht/provider/gupshup.ts) is TODO.
- Redis rate-limiter wiring is TODO.
- Auth0 production callback URLs need to be added to the tenant before
  production.
- WhatsApp approval template needs registration with Meta as
  `dht_property_access_request` / `en_US`.
- Production secrets: `AUTH0_*`, `DHT_DIALOG360_API_KEY` or
  `DHT_GUPSHUP_*`, `DHT_SEQUENCENOW_WEBHOOK_SECRET`.

## What this did NOT include (explicitly out of scope)

Panel schedule builder, panel recall flag engine, AFCI/GFCI overlay,
WeasyPrint label sheets, photo capture / Floci S3, InvoiceChats webhooks,
landlord portfolio dashboard, billing, HVAC / plumbing asset types.
