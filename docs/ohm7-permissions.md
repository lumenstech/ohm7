# ohm7 — permissions

| Capability                         | owner | admin | trade (approved grant) | trade (no grant) | tenant |
|------------------------------------|:-----:|:-----:|:----------------------:|:----------------:|:------:|
| Read property                      |  ✔    |  ✔    |          ✔             |        ✖         |  ✔ (own unit) |
| Write property                     |  ✔    |  ✔    |          ✖             |        ✖         |  ✖     |
| Read panel                         |  ✔    |  ✔    |          ✔             |        ✖         |  ✔ (own unit) |
| Create / update panel              |  ✔    |  ✔    |          ✔             |        ✖         |  ✖     |
| Create / update circuit            |  ✔    |  ✔    |          ✔             |        ✖         |  ✖     |
| Create service event               |  ✔    |  ✔    |          ✔             |        ✖         |  ✖     |
| Approve / deny / revoke a grant    |  ✔    |  ✔    |          ✖             |        ✖         |  ✖     |
| Override a stalled claim           |  ✖    |  ✔    |          ✖             |        ✖         |  ✖     |
| Submit tenant service request      |  ✖    |  ✖    |          ✖             |        ✖         |  ✔     |
| Claim a property                   |  ✔    |  ✔ (override) |    ✖             |        ✖         |  ✖     |

Important invariants enforced in code:

1. **A trade scanning an unassigned sticker never auto-claims a property.**
   `/p/[shortCode]` only shows a "Register this panel" CTA pointing to the
   owner claim flow.
2. **No property is claimed without owner WhatsApp/SMS verification.**
   `PropertyClaim` rows progress `pending → sent → verified` only when the
   correct 6-digit code is supplied. Stalled claims await an admin override.
3. **Tenants cannot grant trade access.** The dashboard layout hides the
   relevant nav entries, the action handlers call `requireRole(["tenant"])`,
   and `permissions.ts` does not include `grant.manage` in the tenant set.
4. **All admin overrides write an `AuditEvent`** with `action =
   "claim.manual_override"` and the entered note in metadata.

See `lib/ohm7/permissions.ts` for `roleCan`, `canAccessProperty`,
`canManageProperty`, and `canRecordOnProperty`.
