# ServiceFixes Digital Home Twin (DHT)

Property-bound electrical panel records, owner-approved access, and service
history. v0.3.1 realignment of the v0.3 MVP.

## Quick start (local)

```bash
pnpm install                              # install deps
cp .env.example .env                      # set DATABASE_URL, AUTH0_*, DHT_*
pnpm prisma:generate
pnpm prisma:migrate:deploy                # apply migration history
pnpm db:seed                              # demo users, jurisdictions, panels
pnpm dev                                  # http://localhost:3000
```

## Identity (Auth0)

Auth replaces the homegrown email/password flow used in v0.3. We use the
[`@auth0/nextjs-auth0`](https://github.com/auth0/nextjs-auth0) SDK v4. Routes
are mounted by the middleware at `/auth/*` (login, logout, callback, etc.).
There is no `/login` or `/signup` page — the marketing site links straight
to the Auth0 Universal Login.

Required env vars:

| Var | Purpose |
|---|---|
| `AUTH0_DOMAIN` | e.g. `your-tenant.us.auth0.com` |
| `AUTH0_CLIENT_ID` | from the Auth0 application |
| `AUTH0_CLIENT_SECRET` | from the Auth0 application |
| `AUTH0_SECRET` | 32-byte hex — `openssl rand -hex 32` |
| `APP_BASE_URL` | e.g. `http://localhost:3000` |

In the Auth0 dashboard, on the existing for-Startups tenant:

1. Applications → Create → "Regular Web Application" named "ServiceFixes DHT".
2. Allowed Callback URLs: `http://localhost:3000/auth/callback`,
   `https://servicefixes.com/auth/callback`.
3. Allowed Logout URLs: `http://localhost:3000`, `https://servicefixes.com`.
4. Allowed Web Origins: same.
5. Authentication → Passwordless: enable Email connection. Bind to this
   application. This is what the owner-shell claim flow uses to verify the
   anonymous claimant's email without a password.
6. Copy domain / client id / client secret → `.env`.

## Messaging (BSP)

`MessageProvider` is a thin BSP-level interface — one job, send a WhatsApp /
SMS message. The orchestration layer (see below) sits on top.

`DHT_MESSAGE_PROVIDER` ∈ `{dialog360, gupshup, simulated, disabled}`:

| Mode | Notes |
|---|---|
| `dialog360` | Primary BSP. `DHT_DIALOG360_API_KEY` required. REST call is TODO — throws clearly on send until wired. |
| `gupshup` | Secondary BSP. `DHT_GUPSHUP_API_KEY` + `_APP_NAME` + `_SOURCE_NUMBER` required. Same TODO. |
| `simulated` | Dev/test only. Records to an in-memory outbox; tests assert it. Refused in production unless `DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true`. |
| `disabled` | Returns `isLive()===false` and throws on send. Use during planned messaging outage. |

**Twilio is removed** from the codebase. It's not our BSP strategy. WASender
is not added (retired from SequenceNow; legacy InvoiceChats only).

## Approval (workflow on top of the provider)

`DHT_APPROVAL_ORCHESTRATOR` ∈ `{sequencenow, disabled}`. The
`SequenceNowOrchestrator` owns the approval-row lifecycle: create
`ApprovalRequest`, send a template via the BSP, handle webhook callback,
expire / resolve. Requires `DHT_SEQUENCENOW_WEBHOOK_SECRET`.

WhatsApp template name: `dht_property_access_request` (en_US) — register
this with Meta before production. Three quick-reply buttons:
`Approve`, `Deny`, `Approve once`.

## Rate limiting

`DHT_RATE_LIMIT_PROVIDER` ∈ `{memory, redis, disabled}`. Production refuses
`memory` unless `DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true`. The Redis
limiter validates `REDIS_URL` but the INCR/EXPIRE call is TODO.

Applied to: `/claim/[code]`, `/claim/[code]/finalize`,
`/p/[code]/request-access`. Login/signup rate-limits are handled by Auth0.

## Demo

After `pnpm db:seed`:

- Demo users: `owner@example.com` / `admin@example.com` (linked to seeded
  Auth0 subs — actual sign-in requires the Auth0 tenant configured above).
- Demo scan codes: `/p/DEMOACTIVE` (active), `/p/DEMO000001` (unassigned).

## Docs

- `docs/dht-v0.3.1-realignment.md` — what changed vs. v0.3
- `docs/ohm7-permissions.md` — role matrix (still valid)
- `docs/ohm7-claim-flow.md` — superseded by the Auth0 flow described above
- `docs/ohm7-compliance-overlay.md` — rules engine
- `docs/ohm7-deployment-checklist.md` — pre-deploy env-var checklist (v0.3 — see realignment doc for v0.3.1 deltas)
- `docs/ohm7-v0.3-hardening.md` — historical; superseded by the realignment doc
- `docs/ohm7-open-questions.md` — open questions

## Verification

```bash
pnpm prisma:generate
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
