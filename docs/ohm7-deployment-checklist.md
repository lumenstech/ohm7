# ohm7 — deployment checklist

This is the minimum required to take a build off `claude/build-ohm7-mvp-QeD6N`
and run it somewhere real. It does not cover infra wiring (Caddy vhost,
TLS, observability) — those follow the existing 5090 conventions.

## Environment variables

### Always required
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string. |
| `AUTH_SECRET` | 32+ char random string for JWT signing. **Rotate per env.** |
| `APP_URL` | Public base URL (used in scan / claim / invite links). |
| `DHT_MESSAGE_PROVIDER` | `simulated` / `twilio` / `sequencenow` / `disabled`. **No default in production.** |
| `DHT_RATE_LIMIT_PROVIDER` | `memory` / `redis` / `disabled`. **No default in production.** |

### Required when `DHT_MESSAGE_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` *and/or* `TWILIO_SMS_FROM`

### Required when `DHT_MESSAGE_PROVIDER=sequencenow`
- `SEQUENCENOW_WEBHOOK_URL`
- `SEQUENCENOW_API_KEY`

### Required when `DHT_RATE_LIMIT_PROVIDER=redis`
- `REDIS_URL`

### Optional production escape hatches (avoid)
- `DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true` — lets the simulated
  provider run in production. **Don't.** Reserved for cold-start staging
  smoke tests.
- `DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true` — lets the in-memory
  rate limiter run in production. Only valid for genuinely single-instance
  deployments.

## Database

```bash
# First-time provisioning:
pnpm prisma:migrate:deploy
pnpm db:seed                      # idempotent — safe to re-run

# Local development:
pnpm prisma:migrate               # equivalent to `prisma migrate dev`
pnpm db:seed
```

Migrations live under `prisma/migrations/`. New schema changes must be
captured with `prisma migrate dev --name <slug>` locally and reviewed
before merge.

## Verification before deploy

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All seven steps must pass. `pnpm test` includes:

- Pure-unit tests (short-code, recall, compliance, pricing, schemas,
  provider, rate-limit, tenant-invite classification).
- Two integration tests that hit Postgres when `DATABASE_URL` is set
  (tenant access boundary; grant approval boundary). These are skipped
  when `DATABASE_URL` is unset, so CI that runs without a database still
  passes — but a real pre-deploy run should set `DATABASE_URL` and
  exercise them.

## Production provider requirements

- `DHT_MESSAGE_PROVIDER` must be `twilio`, `sequencenow`, or `disabled`.
  The current build's REST implementations for Twilio / SequenceNow are
  TODO — they validate config and throw clearly until wired. If
  messaging is unavailable, claim and access-request flows will surface
  a clean "Messaging is currently unavailable" message and audit the
  outcome; they will not silently succeed.

## Rate limiter requirements

- `DHT_RATE_LIMIT_PROVIDER` must be set. `memory` is only acceptable on
  a single-instance deployment and even then requires the explicit
  override. The current Redis implementation validates config and
  throws until INCR/EXPIRE is wired.

## Auth notes

- Email / password with bcrypt + JWT cookie (HS256). The session cookie
  is `httpOnly`, `sameSite=lax`, and `secure` in production.
- `AUTH_SECRET` must be rotated per environment. Anything reused across
  prod/staging is a leak risk.
- The owner-shell created when a non-logged-in claimant verifies a
  property uses a random password. They cannot sign in until the
  password is set. **Add a magic-link / password-set flow before opening
  claims to unauthenticated owners at scale.**

## Known unsafe dev-only settings

- `DHT_MESSAGE_PROVIDER=simulated` logs verification codes to stdout.
- `DHT_RATE_LIMIT_PROVIDER=memory` is not multi-instance safe.
- `DHT_ALLOW_SIMULATED_PROVIDER_IN_PRODUCTION=true` should never be set
  in real prod.
- `DHT_ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION=true` only valid for one
  pod.
- Default seed users (`owner@example.com`, `admin@example.com`,
  password `password123`) are clearly dev fixtures — do not run
  `pnpm db:seed` against a production database.
