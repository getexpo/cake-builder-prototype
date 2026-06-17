# Cake Platform Execution Plan

## Goal
Finish the cake platform MVP around the 3 real business pillars, with recurring scheduled follow-ups, linked docs/tracking, and minimal user babysitting.

## Phases
| Phase | Status | Scope |
|---|---|---|
| Phase 1 | complete | Repair OpenClaw scheduler access and verify recurring jobs |
| Phase 2 | complete | Expand scheduling coverage and set up parallel execution lanes |
| Phase 3 | in_progress | Pillar 1, consumer order placing, prototype refinement and end-to-end flow closure |
| Phase 4 | in_progress | Pillar 2, shop-owner order getting and operations flow closure |
| Phase 5 | in_progress | Pillar 3, fulfillment and delivery definition plus MVP boundaries |
| Phase 6 | in_progress | Update local docs/tracking and align them to the pillar model and Google sheet reality |

## Pillars
1. Order placing for consumers
2. Order getting for shop owners
3. Delivery of the stuff

## Current Parallel Workstreams
1. Scheduler and automation orchestration
2. Consumer ordering flow refinement
3. Shop-owner operations flow refinement
4. Fulfillment and delivery planning
5. Tracker/docs linking and consistency updates

## Current State Notes
- This repo currently contains a frontend prototype plus planning/docs.
- Consumer ordering and shop-owner operations are both partially represented in the prototype.
- Delivery is still mainly planning-level and intentionally not fully operational for MVP.
- Backend architecture and workflow are documented here, but no backend source tree is checked into this repo itself.
- Scheduler coverage is active locally with fresh verified cron jobs.

## Open Issues
- Google sheet status still mixes stale items with real unfinished work.
- Delivery remains the weakest pillar, but the immediate execution gap is to keep MVP pickup completion clearly separated from later delivery work while the account/session and deeper multi-location operations gaps continue to close.
- Pillar 3 tracking should describe the actual pickup completion flow, pickup notification posture, and later delivery branch decision points explicitly instead of collapsing them into generic "fulfillment" wording.
- Need tracker language to distinguish clearly between prototype UI coverage, companion-backend progress, and verified implemented code in this repo.
- Need local docs to keep calling out backend multi-instance drift so future verification does not fall back to stale shared ports by accident.
- Consumer pillar work just closed a real cross-shop checkout integrity gap, but payment and production-grade auth/session lifecycle still remain the main unresolved pillar-1 risks.
- Pillar 2 is stronger now, but the remaining owner-ops gap has shifted toward production-grade money movement, deeper pricing/template and cross-location staffing behavior, and delivery-side exception handling rather than basic pickup-queue lifecycle writes.
- Pillar 3 should now be described as clear pickup-first fulfillment plus deferred delivery branches, not as generic "delivery" progress.
- Any delivery follow-on should be evaluated as a separate branch with its own eligibility, dispatch, proof, fee, and exception model.

## Verification Requirements
- Do not claim scheduling is active without fresh `openclaw cron list` verification.
- Do not claim builds or backend health without running the actual commands.
- Do not describe backend scaffold work as implemented in this repo unless source files are present and verified.
- Keep tracker/docs aligned with real completed work only.
- Judge completion against the 3 business pillars, not generic buckets alone.
