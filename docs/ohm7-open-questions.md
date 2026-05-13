# ohm7 — open questions

## Carried from v0.2 §10.2 (still open after v0.3)

- **Final brand name before sticker print.** "ohm7" is working — revisit once
  we hear it spoken aloud by an electrician and a landlord.
- **Final sticker placement.** Outside cover vs. inside deadfront vs. both
  remains unresolved. Data model already supports all three
  (`stickerPlacement` enum: `outside_cover | deadfront | inside_panel |
  unknown`). Decide after a field test.
- **Real landlord pricing validation.** Currently a public list price
  ($9/$7/$6/$4 cumulative tiers). Validate with three actual landlords
  managing 25 / 100 / 500 units respectively before printing physical
  collateral or wiring billing.
- **Parcel / owner-of-record lookup source.** Out of scope for this MVP.
  Likely USPS + county GIS, but choice depends on geographic coverage we end
  up needing.
- **WhatsApp / SMS provider choice.** v0.3 adds an explicit provider mode
  (`simulated | twilio | sequencenow | disabled`), but the actual REST
  implementations for Twilio and SequenceNow are still TODO. Pick one,
  wire it, and decommission the simulated path for production.
- **AHJ / jurisdiction rules expansion.** v0.3 seeds 9 states + NYC. Full
  national coverage and per-jurisdiction NEC amendments is a structured-data
  ingestion task — not a single-developer week.
- **Whether InvoiceChats event coupling ships in Phase 3.** The
  `ServiceEvent.source` enum already includes `invoicechats`, but the
  webhook subscriber is not built. Decide after the first paying landlord
  onboards.
- **Whether photo storage ships in Phase 1 or Phase 2.** Currently we store
  a JSON array placeholder on `ServiceEvent.photos`. Wire-up to Floci S3 (or
  whatever bucket arch lands) is deferred.

## v0.2-era questions resolved in v0.3

- ~~**Tenant onboarding** — tenant could pick any property.~~ Closed in
  v0.3 by the `TenantInvite` + `UnitTenantAccess` flow. Tenants now only
  see properties they've been explicitly invited to.
- ~~**Rate limiting** — process-local only.~~ The limiter is now an
  explicit-mode provider that refuses to default to memory in production.
  Redis wiring remains TODO (see below).
- ~~**Silent simulated provider in production**.~~ Closed — production
  refuses to use the simulated provider unless an explicit escape hatch
  env var is set.

## New v0.3-era questions

- **Production messaging wiring.** Both `TwilioProvider` and
  `SequenceNowProvider` validate env at boot but throw a clear
  `ProviderMisconfiguredError` on send until the REST call is wired.
  Decide who owns this and ship before opening claim flows in prod.
- **Redis rate limiter implementation.** Same shape — config-validated,
  but `RedisRateLimiter.check()` throws until INCR/EXPIRE is wired.
- **Pending owner shell users.** When an unauthenticated claimant
  verifies a property we still create a `User` with a random password.
  Decide between (a) magic-link / password-set email, (b) defer claim
  completion until the user signs up, (c) Auth0.
- **Multi-org / multi-tenant.** All rows carry `tenantId` per the house
  rule, but there is no Org model yet. Confirm whether ohm7 should
  reuse the existing org/membership tables in the shared 5090 cluster.
- **Public-link grants.** Schema supports `grantee_type=public_link` in
  v0.2 but the MVP only models user-targeted grants. Revisit when an
  inspector or buyer needs a shareable URL.
- **Audit log retention / SOC 2 alignment.** We write an `AuditEvent`
  row per action; ship a retention policy (and tamper-evident export)
  before Type II evidence collection.
