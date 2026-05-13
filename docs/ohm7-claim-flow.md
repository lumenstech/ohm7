# ohm7 — owner claim flow

The v0.2 spec is explicit: **no auto-claim, ever.** A trade scanning an
unassigned sticker may not bind it to a property without owner verification.

## Happy path

```
1. Visit /p/{shortCode} for an unassigned code
   → public scan page renders "Register this panel" CTA
2. /claim/{shortCode}
   → owner submits name, mobile, address, optional unit
   → server generates a 6-digit code, persists it on PropertyClaim,
     and sends via the configured Provider (default: simulated/console)
   → AuditEvent "claim.started"
3. /claim/{shortCode}/verify?claimId=…
   → owner enters the code
   → on success:
       - a User row is created if one doesn't already exist (role=owner)
       - a Property row is created
       - the PanelShortCode is moved to status=active and bound to the property
       - PropertyClaim.verificationStatus → "verified"
       - AuditEvent "claim.verified"
       - session cookie issued, owner redirected to /dashboard/properties/{id}
```

## Failure paths

| State                  | What happens |
|------------------------|--------------|
| Wrong code             | redirect back to /verify with error; PropertyClaim stays `sent` |
| Owner abandons         | Claim row stays `sent`; can be reopened by re-scanning |
| Owner taps "stalled"   | PropertyClaim → `stalled`, AuditEvent `claim.stalled` |
| Admin manual override  | PropertyClaim → `manually_verified`, AuditEvent `claim.manual_override` carrying the override note |

## Provider abstraction

`lib/ohm7/provider.ts` defines a small `Provider` interface with:

- `sendVerification({ channel, toPhone, code, context })`
- `sendApprovalRequest({ channel, toPhone, body, approveUrl, denyUrl })`

Default implementation: `SimulatedProvider` — logs to the server console
including the code, which is also surfaced as a dev-only hint on the verify
page when `WHATSAPP_PROVIDER` is unset.

A Twilio implementation is scaffolded as a TODO and reads `TWILIO_*` env vars.
Production must wire either Twilio or the internal SequenceNow MCP tool.

## Race-condition handling

Two trades scanning the same unassigned sticker both land on the same claim
page. Neither flow can complete without the verification code reaching a
human, so there is no race in which two parties simultaneously bind the same
sticker to different properties. The first owner who verifies wins; the
sticker then moves to `status=active` and the second trade's claim, if any,
must use the access-request flow.
