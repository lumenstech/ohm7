# ohm7 — open questions (carried from v0.2 §10.2 and new MVP-era questions)

## Carried from v0.2 §10.2

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
- **WhatsApp / SMS provider choice.** MVP ships with a simulated provider.
  Production wire-in is between Twilio and the internal SequenceNow MCP tool.
  Provider abstraction is ready for either.
- **AHJ / jurisdiction rules expansion.** The seed file covers NY State / NYC
  / Nassau County. Full coverage is a structured-data ingestion task and is
  not a single-developer week.
- **Whether InvoiceChats event coupling ships in Phase 3.** The
  `ServiceEvent.source` enum already includes `invoicechats`, but the webhook
  subscriber is not built. Decide after the first paying landlord onboards.
- **Whether photo storage ships in Phase 1 or Phase 2.** Currently we store
  a JSON array placeholder on `ServiceEvent.photos`. Wire-up to Floci S3 (or
  whatever bucket arch lands) is deferred.

## New MVP-era questions

- **Tenant onboarding.** Today a tenant signs up freely and can create
  requests against any known property ID. That's wrong long-term — we need a
  formal "owner invites tenant to a unit" flow with a token. See the comment
  in `app/dashboard/tenant/service-requests/new/page.tsx`.
- **Multi-org / multi-tenant.** All rows carry `tenantId` per the house rule,
  but there is no Org model yet. Confirm whether ohm7 should reuse the
  existing org/membership tables in the shared 5090 cluster or run with
  per-user defaults until we hit the first multi-user landlord.
- **Pending owner shell users.** When a non-logged-in owner verifies a claim
  we create a User with a random password. Decide whether to email a
  password-set link, switch to magic-link login, or fall back entirely to
  Auth0 once that integration ships.
- **Public-link grants.** Schema supports `grantee_type=public_link` in v0.2
  but the MVP only models user-targeted grants. Revisit when an inspector
  or buyer needs a shareable URL.
- **Rate limiting.** The in-memory bucket in `lib/ohm7/rate-limit.ts` is
  fine for a single dev server. Replace with a real backing store before
  multi-instance prod.
- **Audit log retention / SOC 2 alignment.** We write an `AuditEvent` row
  per action; ship a retention policy (and tamper-evident export) before
  Type II evidence collection.
