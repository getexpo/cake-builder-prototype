# Findings

## 2026-05-31
- Verified the sharpest remaining pillar-3 gap for this sweep was wording discipline, not new delivery code. The MVP path was already pickup-only, but the docs still benefited from a crisper done-definition for pickup completion and a more explicit gate list for any later delivery branch.
- Verified the strongest low-risk move in this repo was to tighten the local planning artifacts instead of pretending dispatch work exists. `delivery-planning.md`, `pillar-status.md`, and `task-tracker.csv` now call out the pickup done-definition explicitly and separate it from later delivery gates around eligibility, dispatch ownership, proof, money flow, and exception handling.
- Fresh doc verification after this pass shows the repo resume path now consistently describes pillar 3 as a completed pickup lane plus deferred delivery branch, which should reduce future tracker drift.

## 2026-05-31
- Verified the sharpest remaining account gap after refresh persistence was backend session truth, not more static security copy. The UI could describe devices and sessions, but sign-out only cleared local tokens and there was no backend-backed way to inspect or revoke parallel sessions for the same account.
- Verified the best low-risk fix was to add lightweight session endpoints to the companion backend instead of pretending production auth exists. `GET /api/auth/sessions`, `POST /api/auth/logout`, and `POST /api/auth/sessions/:id/revoke` now provide enough real lifecycle behavior for the prototype to show active session counts and sign-out-other-sessions control honestly.
- Fresh isolated proof on `http://localhost:4202` now shows owner session count moving from 1 to 2 after a second login and back to 1 after revoking other sessions, which is materially closer to a believable security/session center than the old local-only toggle model.

## 2026-05-31
- Verified pillar-3 wording still needed another tightening pass even after the earlier pickup-first clarification. The sharp gap was not new delivery code, but making the docs/tracker spell out the actual pickup completion flow, current pickup notification posture, and the unresolved later delivery branch points so future sweeps do not blur them together again.
- Verified the next pillar-2 weakness was lifecycle honesty, not more owner-dashboard wording. The backend still let an operator jump from mid-production to pickup completion, which made queue state look richer than the real operational guardrails.
- Verified the best low-risk fix was to enforce lifecycle sequencing in `cake-platform-backend/src/services.js` and prove the rejection path in `verify-integration.js`, rather than only hiding buttons in the UI. Pickup completion now fails unless the order is already `ready`, and generic status edits now respect forward-only allowed transitions.
- Verified the sharpest support/admin write gap was owner-to-admin exception handoff. `POST /api/owner/orders/:id/flag-exception` now opens or reuses a dispute record, stamps support/refund state onto the order, and queues a support notification so the admin exception panel has a real backend-backed case to resolve.
- Verified the sharpest remaining account gap was refresh behavior, not another static security card. The prototype had session sign-out and reconnect controls already, but it silently recreated every demo session on reload, which undercut the credibility of the profile/security flow.
- Verified the best low-risk fix in this repo was to persist session intent and lightweight session metadata in the frontend, not to fake production auth. `src/App.jsx` now remembers which demo roles should reconnect on refresh, preserves intentional sign-outs across reload, and surfaces device, signed-in, and last-verified timestamps in the session center while still admitting that true production auth and cross-device invalidation are not implemented.
- Verified a real pillar-1 continuity gap in the customer return flow: saved-design reorder already preserved design linkage, but checkout orders created after `Add to checkout` did not. That meant the customer could start from a saved design yet lose the saved-design relationship in downstream order activity/history.
- Verified the best low-risk fix was to carry `savedDesignId` through the cart item and into `/api/orders`, while also keeping the builder aware of which saved design is currently being edited. `src/App.jsx` now preserves that linkage for both direct saved-design carting and save-edit-cart flows.
- Verified proof should cover this exact path, not only reorder. `cake-platform-backend/verify-integration.js` now creates a linked checkout order and confirms the enriched response includes both `savedDesignId` and the nested saved design title.
- Fresh verification on isolated backend `http://localhost:4176` now shows a linked checkout order with `savedDesignId` and `savedDesignTitle` populated, alongside the existing reorder, owner ops, pickup completion, cancellation, dispute, and bulk-apply checks.
- Verified a real backend-scoping bug in the multi-location owner model: the prototype could select locations, but owner queue, summary, and pickup-slot endpoints were still effectively pinned to `shop-1` because the backend ignored owner-requested `shopId` scope.
- Verified the strongest fix was not more UI, but making owner-managed location scope real end to end. `cake-platform-backend/src/app.js` now allows owners to query any managed shop while still blocking access outside their allowed set, and owner mutations now use that same managed-shop access check.
- Verified the frontend needed a distinct concept of active operations scope versus bulk-apply selection scope. `src/App.jsx` now keeps multi-select targeting for bulk apply but also introduces one active owner location that drives live queue, summary, pickup-slot, and staffing context.
- Fresh proof on isolated backend `http://localhost:4176` now shows location-scoped behavior directly: `verify-integration.js` reported 3 owner locations, a Burnaby-only queue count of 1, and 2 Richmond pickup slots through owner-scoped filtering, alongside the existing reorder, owner ops, pickup completion, cancellation, dispute, and bulk-apply checks.
- Verified the next highest-value remaining account/settings gap was real backend scope, not more UI copy. The owner location surface had become believable enough that the sharper move was to wire its selection and bulk-apply actions to companion-backend writes instead of leaving another staged-only control in place.
- Fresh proof on isolated backend `http://localhost:4174` now covers owner location discovery and scoped multi-location apply as well as the older reorder, owner ops, pickup completion, cancellation, dispute, and slot flows. `verify-integration.js` succeeded with 3 owner-managed locations and a successful `holiday-menu` apply across `shop-2` and `shop-3`.
- Verified pillar-3 language needed tightening more than new feature claims. The companion backend implements pickup-only closeout, not delivery operations, so the honest improvement was to document the fulfillment boundary more explicitly instead of implying broader delivery progress.
- Verified current proof sources still support the narrower claim: `cake-platform-backend/src/services.js` builds pickup-first fulfillment snapshots, queues pickup-oriented notifications, and only allows `completePickup` for pickup fulfillment, while `cake-platform-backend/src/app.js` exposes `POST /api/owner/orders/:id/complete-pickup` rather than a delivery-completion branch.
- Verified the integration proof script still exercises the right MVP path: `cake-platform-backend/verify-integration.js` covers reorder, owner ops update, pickup completion, notification reads, and pickup-slot patching, which is good evidence for pickup-first fulfillment clarity but not for real delivery readiness.
- Verified the next real pillar-2 gap was backend write coverage, not more passive owner copy. The strongest value move was to close the operational seams for reassignment, cancellation, cancelled-queue visibility, and admin dispute/refund handling rather than adding another read-only dashboard section.
- Verified multi-instance backend drift still matters during proof runs: port `4020` was occupied by an older server that did not expose the new owner ops contract, so fresh evidence for this pass came from an isolated current-source backend on `http://localhost:4172`.
- Fresh verification after this owner-ops pass: `npm run build` succeeded in `cake-builder-prototype`, and `BASE_URL=http://localhost:4172 node verify-integration.js` succeeded in `cake-platform-backend` with proof for owner ops update, pickup completion, pickup-slot patch, cancellation with released lifecycle state, cancelled queue counts, and dispute resolution.
- Verified the next consumer-confidence improvement is not more generic copy, but explicit next-step guidance at checkout plus an in-place reconnect action. `src/App.jsx` now tells the customer what to do next when ordering is blocked and does not force a detour through the accounts screen just to restore session clarity.
- Verified the old "top unfinished UX tracks" wording is now stale in the other direction too: the profile drawer/help/logout microflow and interactive multi-location selection are no longer just planned. The next honest gap is production-grade auth/session lifecycle plus real backend write coverage for location-scoped bulk apply.
- Verified doc/tracker drift after the account/settings pass: the old "top unfinished UX tracks" wording was stale because the profile-style account entry, settings IA, and multi-location owner concept are now already represented in the prototype. The sharper resume path is to finish the real profile drawer/help/logout microflow first, then make location switching and selective bulk-apply behavior interactive.
- Verified current backend-operational risk is local multi-instance drift, not missing frontend integration. Older shared-store ports such as `4020` and intermediate current-contract ports such as `4120` can still mislead verification; isolated port `4160` is the cleanest current backend target called out in the latest local checkpoint.
- Verified repo-state language still needs to distinguish between prototype representation, companion-backend behavior, and production-grade account/session completeness. The docs should keep calling the account/session model demo-grade even though the visible role chooser has been replaced by a more credible profile/settings surface.
- Verified a fresh integration-proof drift problem on 2026-05-31: both the frontend candidate list and `cake-platform-backend/verify-integration.js` could still attach to older local servers before checking the newer owner-location contract. The sharper fix was to make backend probing require `/api/owner/locations` and prefer isolated current-contract ports (`4176`, `4174`, `4172`, `4170`) before falling back to older ports such as `4020`.

## 2026-05-29
- Verified another real consumer-flow gap: relying on pickup-slot label text is not enough once slot dates drift. `src/App.jsx` now derives customer-facing pickup timing from `startTime` and `endTime` when present and uses explicit slot-state logic to block expired, paused, or full windows.
- Verified saved-design retention gap closure: passive saved cards were less useful than cards ordered by return value, so the saved-designs grid now sorts by favorites and recency and shows the latest linked order activity per design.
- Verified session-clarity improvement: customer reconnect no longer lives only in the accounts screen. The saved-designs view now exposes an in-context reconnect path at the point where reorder and favorite actions would otherwise fail.
- Verified integration-proof pitfall: the default verification attempt can still hit an older backend on `4020` that lacks `POST /api/owner/orders/:id/complete-pickup`. Fresh proof on `http://localhost:4164` confirmed the current backend contract remains healthy end to end.
- Fresh verification after this pass: `npm run lint`, `npm run build`, and `BASE_URL=http://localhost:4164 node verify-integration.js` all succeeded.

## 2026-05-28
- OpenClaw scheduler blocker was gateway/operator pairing authorization, not cron syntax.
- `openclaw cron list` now works and shows real enabled jobs.
- Existing verified recurring jobs:
  - cake-platform-progress-sweep
  - cake-platform-backend-health
  - cake-platform-eod-checkpoint
- Expanded cron coverage now includes 6 verified enabled jobs total, adding:
  - cake-platform-docs-tracker-sweep
  - cake-platform-google-sync-check
  - cake-platform-integration-push

## 2026-05-28 Google sync verification
- Local Google sync code exists for the cake platform in `sync_all_project_docs.js` and `push_docs_to_google.js`.
- `sync_all_project_docs.js` targets the current 9-file cake doc set in `cake-builder-prototype/` and maps them into Google Docs/Sheets by exact parent folder IDs.
- Read-only Drive verification confirms all 9 expected Google-side items exist exactly once in the intended folders:
  - Product Structure
  - Launch Plan
  - MVP Scope
  - Architecture Outline
  - Pricing and Revenue Model
  - Delivery Planning
  - Owner Backend Scope
  - One Hour CEO Plan
  - Master Task Tracker
- Read-only Sheets verification on 2026-05-28 confirmed `Master Task Tracker` had 25 rows at that time, matching the local `task-tracker.csv` structure then.
- Current local follow-up audit shows `task-tracker.csv` has grown to 27 tasks total (28 lines including the header), so Google-side tracker parity should now be treated as potentially stale until the next sync verification.
- A separate Google Sheets OAuth integration also exists locally in `google_sheets_integration_oauth.js`, but it points to a different spreadsheet (`1_78XFt...`) used for the older content pipeline workflow, not the cake platform tracker.
- Verified blocker: Google sync is not unified yet. The cake doc push scripts use `google_token.json` with redirect URI `http://localhost:3000/oauth2callback`, while the generic OAuth handler and Sheets helper use `.google_drive_token.json` with redirect URI `http://localhost:8888/callback`.
- Verified blocker: `test_sheets_oauth.js` proving Sheets access only verifies the old content-pipeline sheet, so it is not evidence of cake tracker sync by itself.
- Safest next action: standardize cake project sync onto one auth path, then use the 9-file `sync_all_project_docs.js` flow as the single source of truth for Google-side docs/tracker updates.
- Frontend prototype already includes builder, checkout, accounts, saved designs, owner dashboard, and workflow/status UI in `src/App.jsx`.
- Backend architecture, API shape, and workflows are documented locally, but no backend source files are present in this repo yet.
- Verified distinction to keep in docs: backend activity can exist in the separate companion service described by `backend-implementation-notes.md`, but that does not mean backend code exists inside this repo.
- Best parallelization split is still by concern boundary to avoid file collisions:
  - frontend refinement
  - backend planning / future scaffold creation
  - docs/tracking/link consistency
  - Google-side sync verification
- The main local doc risk was mismatch between verified scheduler state and stale tracker wording, plus drift between UI/prototype progress and backend-implementation wording.
- For live MVP wiring, the frontend must authenticate twice, once as demo customer and once as demo owner, because customer and owner flows hit different protected backend routes.
- The backend scaffold already includes persistence/auth/service layers beyond the original static demo data, so frontend integration should target those real routes instead of hard-coded mock arrays.
- Verified UX gap and fix: the builder was previously resetting layer selections too aggressively on mode, occasion, and layer-count changes. `src/App.jsx` now preserves overlapping editable layer customizations where possible, which is a better fit for the occasion-first / multi-layer flow.
- Verified next-gap closure: priority integration flows benefit more from real selection/edit loops than from more static dashboard copy. The strongest next improvements were owner queue selection, backend-driven status metadata, pickup-slot editing, and loading saved designs back into the builder.
- Fresh frontend verification after that pass: `npm run build` succeeded and `npm run lint` returned clean output.
- Next high-value account-system gap is now partially closed in the prototype: `src/App.jsx` supports explicit per-role demo session sign-out/reconnect and a live access check that proves both an allowed route and an expected permission denial against the backend.
- Fresh verification after the account UX pass: `npm run lint` and `npm run build` both succeeded again.
- Verified next UX gap closure for the highest-priority builder track: adding editor-side layer shortcuts is more valuable than more static copy because it reduces repetitive multi-layer editing directly in the main ordering flow. The prototype now supports one-tap reset-to-preset, apply-active-layer-to-all, and per-layer summary-chip navigation.
- Fresh frontend verification after the builder-shortcuts pass: `npm run lint` and `npm run build` both succeeded.
- Verified next consumer-ordering gap closure: checkout confidence improves materially when the UI states exactly what blocks ordering, shows customer-session health, and filters pickup choices through remaining capacity instead of treating every active slot as equally selectable.
- Verified saved-design retention improvement: customers benefit from direct saved-design actions more than passive listing alone, so the prototype now supports local favorites, add-from-saved into checkout, and latest-save highlighting for quick return-to-flow behavior.
- Fresh frontend verification after this consumer-flow pass: `npm run lint` and `npm run build` both succeeded.
- Verified next pillar-2 gap closure: owner operations benefit more from triage visibility than from more passive dashboard copy, so the strongest next move was to surface exception states directly in the queue and order detail. The prototype now calls out missing notes, missing pickup assignment, and slot-risk cases while also showing remaining pickup-slot capacity and operator-facing slot state.
- Fresh verification after this owner-operations pass: `npm run lint` and `npm run build` both succeeded.
- Fresh backend verification on port `4120`: owner queue returned 1 new order, status metadata returned `new,confirmed,baking,decorating,ready,picked_up`, owner pickup-slot endpoint returned 2 slots, staff summary returned 1 visible order, and admin analytics reported 1 active shop.
- Verified integration drift still matters in practice: the frontend's old default `http://localhost:4020` can bind to a stale reduced backend that lacks the current saved-design, owner queue, status metadata, and pickup-slot contract. The safer integration posture is to probe the actual routes needed for the live flow and only connect when those endpoints respond with the expected status patterns.
- Fresh proof after the drift fix: a current-source backend on `4126` passed the end-to-end integration script for saved design create/list, reorder, owner queue/detail/status, pickup completion, notification timeline, and pickup-slot patch.
- Verified next owner-ops gap closure: the frontend should not mark pickup complete through the generic status route because the backend already models pickup handoff as a distinct completion action with metadata. `src/App.jsx` now routes pickup handoff through `POST /api/owner/orders/:id/complete-pickup`, removes `picked_up` from the generic status-action pills, and shows the returned completion timestamp / actor fields in owner order detail.
- Fresh verification after this pass: `npm run lint`, `npm run build`, and `node verify-integration.js` all succeeded against isolated backend `http://localhost:4164`.
