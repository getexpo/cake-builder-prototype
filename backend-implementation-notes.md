# Backend Implementation Notes

## 2026-05-28 backend scaffold evolution
The companion backend in `cake-platform-backend` has been moved one step beyond array-only demo state.

### New internal architecture
- `store.js` persists demo state to `data/db.json`
- `repositories.js` provides collection access seams that can later point to SQLite or Postgres
- `services.js` centralizes order creation, reorder flow, pickup-slot reservation, notification queuing, and pickup-slot validation for owner edits
- `auth.js` adds lightweight bearer-token sessions and role-aware route guards

### Why this matters
This preserves the prototype-friendly API surface while introducing the MVP backend concerns already described in:
- `owner-backend-scope.md`
- `backend-workflow-spec.md`

Specifically, the backend now has clearer seams for:
- persistence
- auth context
- tenant-aware owner access
- service-level workflow orchestration

### Still intentionally lightweight
This is not production auth or production persistence yet.
It is a transition state meant to reduce rewrite risk when moving to a real database and stronger identity stack.

### Newly verified contract details
- Customer-authenticated saved-design creation now stamps `customerId` from the active session instead of trusting the request body.
- Reorder now requires the saved design to belong to the signed-in customer.
- Owner pickup-slot edits now validate that `capacity >= booked` before persisting.
- Pickup orders now stamp a `fulfillmentSnapshot` that explicitly marks pickup as the MVP-locked path instead of pretending delivery is already implemented.
- Pickup orders now queue confirmation plus pickup-reminder notification events, `ready` queues `ready_for_pickup`, and `POST /api/owner/orders/:id/complete-pickup` closes the MVP handoff with `pickup_completed`.
- Frontend/backend integration is now more resilient to local drift because the prototype probes for the current backend contract instead of blindly trusting port `4020`, which has repeatedly been observed serving the older reduced API surface.
- Consumer checkout integrity is now tighter: order creation validates that the order shop exists, any linked saved design belongs to the signed-in customer and the same shop, and the reserved pickup slot belongs to that same shop before the order is accepted.
- Customer saved-design and pickup-slot integration now supports multi-bakery continuity more honestly: the frontend can hydrate the signed-in customer's saved designs across shops, save new designs against the currently selected bakery, and use the linked shop to keep reorder and checkout pickup-slot choices aligned.

### Recommended next backend increment
1. swap file store for SQLite/Postgres repository implementations
2. add schema validation on write paths
3. replace demo token issuance with password/OAuth-backed signed sessions
4. add pricing engine extraction so order totals are computed centrally
5. add delivery as a separate post-MVP fulfillment branch with its own decision states, dispatch, and completion rules
