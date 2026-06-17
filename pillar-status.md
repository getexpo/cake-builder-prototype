# Pillar Status - Cake Platform

## Pillar 1 - Order placing for consumers
### Already in place
- Visual cake builder exists in the prototype.
- Simple and advanced modes are live.
- Occasion-first and layer-aware behavior exists.
- Pickup slot selection now uses live slot timing/state, recommends the best selectable window, explains reservation confidence more clearly, and scopes checkout slot choices to the active cart item's bakery instead of assuming one default shop.
- Saved designs now have documented and partially wired return/reorder flows.
- Checkout-created orders can now preserve their saved-design linkage when a customer starts from a saved cake, so saved-design activity/history stays connected instead of only the dedicated reorder path carrying that relationship.
- Saved-design checkout now carries the originating shop through cart and checkout, so the selected pickup bakery, available windows, and created order stay aligned.
- The customer account surface now includes a real profile drawer microflow with help and logout placement instead of only describing it.
- Account-role demo sessions and access checks exist in the prototype, and the consumer session probe now requires the backend session contract instead of silently attaching to older reduced servers first.

### Still open
- Checkout is materially clearer, but payment and true production auth/session lifecycle are still not complete.
- Saved designs and favorites now persist more credibly through the companion backend, and checkout can now keep saved-design linkage intact across bakery-specific pickup selection, but the broader customer account/session model is still demo-grade rather than production-grade.
- Customer account/session handling is still demo-grade, not production-grade.

### Honest status
Partially done.

## Pillar 2 - Order getting for shop owners
### Already in place
- Owner and staff views are represented in the prototype.
- Owner queue now surfaces grouped live orders plus exception callouts for missing pickup slots, missing operator notes, and pickup-slot overbooking risk.
- Owner queue now carries backend-generated attention flags and attention counts, so support disputes, paused pickup slots, unassigned production work, and other operational risks can be surfaced and prioritized consistently instead of being inferred only in the UI.
- Order detail now shows the active operational risk and recent workflow-event count, not just the happy-path fields.
- Pickup-slot operations now expose remaining capacity and an operator-facing state so staff can see when a slot is full, paused, or still accepting volume.
- Owner exception handling now covers both escalation and follow-up: owners/staff can open a dispute-backed exception, append internal follow-up notes to the same thread, and keep support/admin handoff tied to the order instead of losing context across tools.
- Admin/support concepts and analytics visibility are represented, including a small exception center that ties queue issues to staff/admin visibility.
- Order workflow and pickup-slot management are documented with live companion-backend references in notes.
- Companion backend now supports owner/staff operational write paths for notes, pickup-slot reassignment, staff assignment, explicit order cancellation with slot release, and an owner queue that includes cancelled orders as a first-class lifecycle bucket.
- Admin exception handling is now materially deeper in the companion backend: disputes can be resolved or escalated, refund state can be tracked, and those outcomes roll back onto the related order support/refund state.
- The prototype owner dashboard now exposes those newer lifecycle and exception states instead of only describing them, including cancelled-order visibility, assignee/supply-side support fields, and inline admin dispute actions.

### Still open
- Production-grade payment/refund execution, richer staff rosters, and durable audit/history views are still not fully implemented.
- Exception handling is now much more real, but it is still demo-grade in breadth, especially around multi-shop staffing, real refund processors, and non-pickup fulfillment branches.
- Some backend-reliant claims depend on a companion backend, not checked-in source in this repo.

### Honest status
More operationally credible and meaningfully deeper, especially around queue triage, pickup-slot state, full lifecycle guardrails, and support/admin exception handoff, still partial.

## Pillar 3 - Delivery of the stuff
### Already in place
- Pickup-first strategy is documented.
- Pickup flow exists as the MVP fulfillment path.
- Delivery options and later-stage models are documented.
- Companion backend now makes the MVP boundary explicit: pickup orders stamp a fulfillment snapshot, queue pickup-oriented notifications, and close through a dedicated pickup-completion step instead of a fake delivery flow.
- The current fulfillment closeout is now described more precisely as a pickup completion flow: slot chosen at checkout, pickup notifications queued, order advanced to `ready`, then explicitly closed as picked up.
- The fulfillment language is now clearer about what is really implemented: pickup completion, pickup notifications, and pickup-only closeout are MVP behavior, while delivery remains a later branch.
- The pickup lane now has a sharper done-definition in local docs: bakery-matched slot selection, pickup-only notifications, `ready` before completion, and pickup-complete closeout without pretending delivery fees, courier assignment, or proof-of-delivery exist.

### Still open
- Delivery operations are not implemented as a closed working pillar.
- Third-party delivery integration is not yet wired.
- Internal courier workflow is intentionally deferred.
- Delivery decisioning is intentionally parked behind a later fulfillment branch, not mixed into MVP pickup completion.
- No delivery-specific notification timeline, dispatch flow, proof-of-delivery step, or fee/exception handling is implemented yet.
- Delivery branch entry rules are still unresolved: eligibility, shop approval timing, branch-point state model, and proof requirements are planning questions, not solved implementation.
- The delivery branch still has no approved gate model for eligibility, dispatch ownership, proof artifact, fee settlement, or exception recovery, so it should stay clearly separate from MVP pickup wording in trackers and summaries.

### Honest status
MVP pickup completion is now a clearer, separately closed fulfillment path with an explicit pickup-only notification, `ready`-then-pickup closeout story, and a documented done-definition. True delivery is still planning-level and remains the weakest pillar.

## Summary
- Pillar 1: partial
- Pillar 2: partial
- Pillar 3: mostly planning

## Immediate priority
1. Turn the remaining demo-grade session model into a more realistic auth/session lifecycle, especially around reconnect, persistence, and cross-device invalidation now that saved-design handoff and bakery-scoped checkout are tighter.
2. Deepen the multi-location owner model beyond the current verified scope, especially around pricing/template depth and broader cross-location staffing behavior.
3. Keep scheduling and tracker wording focused on real unfinished work under these 3 pillars, especially where prototype coverage, companion-backend behavior, and still-deferred delivery work diverge.
4. If pillar 3 advances again, the next honest step is delivery branch design gates and decision ownership, not relabeling pickup completion as delivery progress.
