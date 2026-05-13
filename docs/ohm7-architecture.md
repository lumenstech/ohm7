# ohm7 — architecture

## Stack

| Layer        | Choice                                         |
|--------------|------------------------------------------------|
| Web app      | Next.js 14 App Router, TypeScript              |
| UI           | Tailwind, hand-rolled components               |
| Validation   | Zod                                            |
| Data         | Postgres via Prisma                            |
| Auth         | bcrypt + JWT cookie (jose)                     |
| Messaging    | Provider abstraction (`lib/ohm7/provider.ts`)  |
| Tests        | Vitest                                         |

## Code layout

```
app/
  page.tsx                       # landing
  pricing/                       # marketing
  for-landlords|trades|tenants/  # marketing
  safety/                        # disclaimers
  signup/login/                  # auth
  p/[shortCode]/                 # public scan + request-access
  claim/[shortCode]/             # owner claim + verify
  dashboard/                     # authenticated app
  admin/                         # admin-only screens
  api/auth/logout/               # session clear
components/                      # presentational shell
lib/
  db.ts                          # prisma client
  auth.ts                        # session jwt + cookie helpers
  short-code.ts                  # crockford base32 short code
  cn.ts                          # tailwind class merge
  ohm7/
    permissions.ts               # roleCan + canAccessProperty
    compliance-rules.ts          # heuristic NEC overlay
    recall-rules.ts              # panel hazard flags
    pricing.ts                   # landlord tier config
    audit.ts                     # writeAudit()
    provider.ts                  # simulated/twilio provider
    rate-limit.ts                # tiny in-memory limiter
    scan-view.ts                 # public-safe scan view
    zod-schemas.ts               # all request shapes
prisma/
  schema.prisma                  # all models + enums
  seed.ts
tests/                           # vitest unit tests
docs/                            # this directory
```

## High-level flow

```
QR scan                          /p/[shortCode]
  ├── unassigned ────────→  /claim/[shortCode]   (Flow 2)
  │                              │ owner enters address+phone
  │                              ▼ 6-digit verification
  │                              ▼ property + sticker bound
  └── active ─────────────→  /p/[shortCode]/request-access  (Flow 3)
                                 │ trade fills form
                                 ▼ AccessGrant created (status=pending)
                                 ▼ owner notified via Provider
                                 ▼ owner approves in /dashboard/access-requests/[id]
                                 ▼ trade can now read panel + write events
```

## Reuse notes (vs. v0.2 stack-map table)

This MVP intentionally writes its own auth and a simulated WhatsApp provider
rather than depending on the SequenceNow MCP server or shared Auth0 tenant. The
provider abstraction is shaped so the production wiring (Twilio / SequenceNow /
Dialog360) drops in as a single `Provider` implementation.

InvoiceChats is **not** integrated — the v0.2 doc explicitly defers webhook
coupling to Phase 3 ("tight on data, loose on identity"). `ServiceEvent.source`
already carries an `invoicechats` enum value so that wire-in is a one-line
change later.
