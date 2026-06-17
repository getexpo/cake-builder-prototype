# Cake Builder Prototype

A local React + Vite prototype for a multi-tenant cake ordering platform, plus the working docs and trackers that define the MVP.

## Current repo state
- Frontend: interactive prototype in `src/App.jsx`
- Backend in this repo: planning/spec docs only, no backend source tree checked in here yet
- Companion backend context: `backend-implementation-notes.md` tracks verified progress in the separate `cake-platform-backend` service
- Tracking: local resume docs in `task_plan.md`, `progress.md`, `findings.md`, and `task-tracker.csv`

## Run locally
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

## Backend connection note
- The frontend now auto-detects a compatible local backend contract instead of assuming the stale default port is correct.
- It prefers `VITE_API_BASE_URL` when set, otherwise probes the local companion backend ports and only connects when `/api/meta/order-statuses`, `/api/auth/me`, `/api/owner/queue`, and `/api/owner/locations` behave like the current contract.
- Probe priority now starts with the newest isolated verification ports (`4176`, `4174`, `4172`, `4170`) before falling back to older shared ports.
- Right now that matters because local port `4020` can still serve an older reduced API while newer verified integration flows may be running on another local port.

## Key docs
- `task_plan.md` - execution phases and verification rules
- `progress.md` - latest dated progress log
- `findings.md` - verified findings and constraints
- `pillar-status.md` - honest pillar-by-pillar rollup for consumer ordering, shop-owner operations, and fulfillment/delivery
- `task-tracker.csv` - task-level status tracker
- `mvp-scope.md` - MVP boundaries
- `architecture-outline.md` - system structure
- `backend-workflow-spec.md` - backend workflow and API shape
- `backend-implementation-notes.md` - verified notes about the separate companion backend service
- `owner-backend-scope.md` - owner/admin/backend scope
- `product-structure.md` - product surface and feature grouping
- `launch-plan.md` - go-to-market and launch framing
- `pricing-revenue-model.md` - pricing and revenue assumptions
- `delivery-planning.md` - delivery posture and tradeoffs
- `investor-demo-framing.md` - investor/demo narrative
- `one-hour-ceo-plan.md` - executive summary plan

## Resume here first
1. Read `progress.md` for the last confirmed state.
2. Check `findings.md` for constraints and verified facts.
3. Read `pillar-status.md` to orient around the 3 real business pillars before choosing work.
4. Use `task-tracker.csv` to pick the next in-progress item. Current top unfinished tracks are production-grade auth/session lifecycle, deeper pricing/template and cross-location staffing behavior in the multi-location owner model, and keeping fulfillment wording honest about MVP pickup completion versus deferred delivery.
5. For pillar 3, treat pickup completion flow, pickup notifications, and pickup-only closeout as the implemented MVP lane. Treat delivery eligibility, dispatch, proof, fees, and delivery exceptions as later-branch work unless fresh evidence says otherwise.
6. Treat backend work in this repo as planned unless new local source files are added and verified. If backend behavior is mentioned, cross-check `backend-implementation-notes.md` to see whether it refers to the separate companion backend service, and prefer the latest verified isolated backend target instead of assuming the older shared ports are current.
7. For fulfillment claims, separate MVP pickup completion from any future delivery branch. Do not describe pickup closeout as if courier dispatch or delivery proof already exists.
