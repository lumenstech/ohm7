# ohm7 — MVP feature inventory

## In scope (this MVP)

- Public scan landing page (`/p/[shortCode]`) — redacted, anonymous-safe.
- Owner-driven property claim flow with 6-digit WhatsApp/SMS verification.
- Trade access request flow — never auto-claims, owner approval required.
- Dashboard CRUD for properties, panels, circuits, service events, grants.
- Tenant role: submit service requests; cannot grant access.
- Admin override path for stalled claims; every override is audited.
- Heuristic compliance overlay (AFCI / GFCI / 210.8(F)).
- Heuristic panel recall flags (FPE / Zinsco / Pushmatic / GE THQL date-codes).
- Audit log on every important action.
- Marketing pages and a pricing page driven by config.

## Out of scope (deferred)

- Native mobile apps.
- Full NEC legal engine — we reference section numbers only.
- Parcel-record / owner-of-record lookup.
- Stripe billing wiring.
- Real WhatsApp/Twilio provider — wire-in is TODO.
- InvoiceChats integration (Phase 3).
- AI / OCR / panel photo capture.
- Trade marketplace, inspection workflows, photo storage with signed URLs.

## Notable architecture decisions

- One `User` model with `role` enum — keeps the MVP coherent. A future change
  can split Org / Membership if multi-tenant org features ship.
- `tenant_id` columns are present per the v0.2 house rule even though the MVP
  defaults to a single implicit tenant.
- Short codes are 10-char Crockford base32 — printable on a 1.5" sticker,
  ≈50 bits of entropy, no homoglyphs.
- All compliance flags are heuristic; every UI surface includes an
  "verify with AHJ" disclaimer.
