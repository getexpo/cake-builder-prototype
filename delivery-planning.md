# Delivery Planning - Cake Shop Platform

## MVP boundary
The MVP fulfillment path is pickup, not delivery.

What is in the MVP now:
- Pickup slot selection at checkout
- Pickup-oriented notification events
- Owner/staff pickup completion through a dedicated completion step
- Fulfillment snapshots that explicitly mark pickup orders as `mvp_pickup_complete`
- Pickup-only closeout rules that keep fulfillment honest instead of pretending a courier handoff exists

What is not in the MVP:
- Courier dispatch
- Driver assignment
- Delivery ETA promises
- Proof of delivery
- Delivery fee calculation and settlement
- Delivery exception handling beyond planning

## MVP pickup completion flow
The current fulfillment closeout is intentionally narrow:
1. Customer chooses a pickup slot during checkout.
2. Order creation queues `order_confirmation` and pickup reminder notifications.
3. Owner/staff moves the order through production toward `ready`.
4. Ready state triggers the ready-for-pickup message, still inside the pickup lane.
5. Pickup completion is a separate explicit action, not just a generic delivery/status shortcut.
6. Pickup closeout updates the fulfillment snapshot so the order reads as a completed pickup, not as a delivered order.

That means the MVP proves handoff clarity for pickup only. It does not prove dispatch, courier acceptance, proof-of-delivery, or delivery-issue recovery.

## MVP pickup completion done definition
Pickup completion can be described as done only when all of these stay true:
- Checkout selected a valid pickup slot for the same bakery as the order
- Notification timeline stays pickup-specific, not courier/delivery-specific
- Operations flow reaches `ready` before pickup completion is allowed
- Closeout records a pickup-complete outcome such as `picked_up` or `mvp_pickup_complete`, not `delivered`
- No delivery fee, courier assignment, proof-of-delivery, or dispatch promise is implied in the same flow

## MVP notification posture
Current fulfillment messaging is pickup-oriented:
- Order confirmation after order creation
- Pickup reminder queued for pickup orders
- Ready-for-pickup notification when the order reaches `ready`
- Pickup-completion history attached to the pickup closeout path

What is still missing for true delivery:
- Out-for-delivery notification
- Courier assigned / courier arriving notices
- Delivery completed confirmation
- Failed-attempt / damaged-order / late-handoff exception notifications

## Delivery decision points after MVP
Before enabling any delivery branch, the product should answer:
- Which orders are delivery-eligible versus pickup-only?
- Is delivery decided at checkout, after shop review, or both?
- Who fulfills delivery: third-party partner or internal courier?
- When does the shop confirm or reject delivery feasibility?
- What is the exact branch point from pickup-default orders into delivery-reviewed orders?
- How are delivery fees, damage claims, late handoffs, and redelivery attempts handled?
- What customer notification timeline replaces the pickup reminder / ready / picked-up flow?
- What proof artifact closes the order: courier proof, customer code, photo, signature, or manual override?

## Delivery branch design gates
Do not treat delivery as started until there is a concrete answer for each gate below:
- Eligibility gate: radius, basket size, cake-type restrictions, and black-out conditions
- Decision gate: whether delivery can be chosen instantly or needs bakery approval/review
- Dispatch gate: who books the trip and where courier acceptance state lives
- Notification gate: exact event timeline from order confirmation through handoff and completion
- Proof gate: what artifact closes the order and how disputes override it
- Money gate: delivery fee pricing, courier cost settlement, refunds, and failed-attempt liability
- Exception gate: late handoff, melted/damaged cake, no-answer recipient, redelivery, and return-to-shop handling

## Delivery options

### Option 1 - Pickup only first
- Fastest MVP
- No driver network required
- Lowest operational risk
- Keeps order completion honest while the core product proves demand

### Option 2 - Third-party delivery integration
- Uber Direct
- DoorDash Drive
- Local courier partners
- Lower complexity than building an internal network
- Best first post-MVP branch if delivery demand is real

### Option 3 - Internal driver network
- Driver onboarding
- Dispatch logic
- Time windows
- Proof of delivery
- Payouts
- Damage/refund handling
- Highest complexity, should come last

## Recommendation
Start with pickup first, then third-party delivery integration. Build internal driver network only after clear demand and order density.

## What to track before delivery build-out
- Delivery attach rate requests versus completed pickup orders
- Average delivery distance
- Delivery fee tolerance
- Damage/refund rates
- Courier reliability
- Shops that actually need delivery versus shops that only need cleaner pickup handoff

## Planning note
Delivery matters, but it should not blur the MVP. Pickup completion should stay a separate finished flow until a real delivery branch is intentionally built. Any future delivery work should be described as a new fulfillment branch with its own eligibility, dispatch, notification, proof, fee, and exception model, not as an extension of the existing pickup-completion step.
