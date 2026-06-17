# Backend Workflow Spec - Cake Shop Platform

## Goal
Turn the product structure into a concrete backend-oriented workflow map for MVP execution.

## Core principle
The backend should support the real-life order lifecycle without forcing delivery complexity too early.

MVP should prioritize:
- multi-tenant separation
- customer ordering
- owner operations
- pickup workflow
- role-aware access
- pricing consistency

## Main services
- Auth service
- Shop service
- Template service
- Pricing engine
- Order service
- Saved design service
- Notification service
- Billing service
- Admin service

## Key entities
### Shop
- id
- name
- branding
- pickup settings
- business hours
- lead times
- subscription plan

### User
- id
- shop_id nullable for platform admins and customers
- role
- email
- phone
- auth provider
- status

### Role types
- customer
- owner
- staff
- admin

### Cake template
- id
- shop_id
- occasion
- default mode
- allowed cake types
- default layers
- price modifiers

### Saved design
- id
- customer_id
- shop_id
- design payload
- title
- last_used_at

### Order
- id
- shop_id
- customer_id
- saved_design_id nullable
- status
- pickup_slot_id
- price_total
- notes
- design_snapshot
- created_at

### Pickup slot
- id
- shop_id
- start_time
- end_time
- capacity
- active

### Notification event
- id
- order_id
- type
- status
- scheduled_for
- sent_at

## Customer workflow
1. Customer chooses an occasion.
2. Builder loads shop rules and occasion defaults.
3. Customer selects simple or advanced mode.
4. Customer customizes cake within allowed constraints.
5. Pricing engine recalculates live total.
6. Customer can save design if authenticated.
7. Customer adds to cart and chooses pickup slot.
8. Order is created with full design snapshot.
9. Confirmation notification is queued.

## Saved design workflow
1. Customer saves a design.
2. Saved design stores normalized config plus summary metadata.
3. Customer can reopen it later and load it into the builder.
4. Reorder can create a new order from previous design data rather than rebuilding manually.

## Owner workflow
1. Owner receives new order in queue.
2. Owner reviews order details and cake design snapshot.
3. Owner confirms or modifies order.
4. Staff/owner moves order through stages:
   - new
   - confirmed
   - baking
   - decorating
   - ready
   - picked_up
5. Notification service triggers customer updates at key moments.
6. Order closes when pickup is completed.

## Staff workflow
- staff can view assigned production queues
- staff can update status based on permissions
- staff should not access subscription billing or global shop settings unless explicitly allowed

## Admin workflow
- platform admin can inspect all shops
- monitor subscription status
- review disputes or support issues
- inspect order-level issues if escalation is needed
- view high-level platform analytics

## Pricing workflow
1. Base cake type price loads.
2. Layer count modifier applies.
3. Ingredient option price modifiers apply.
4. Shop-specific premium rules apply.
5. Final order total is stored on the order snapshot.

Important: order pricing should be snapshot-based so historical orders do not change when templates or prices change later.

## Pickup workflow
1. Shop defines available pickup slots.
2. Customer selects from available slots during checkout.
3. Capacity rules prevent overbooking.
4. Reminder notification triggers before pickup time.
5. Ready-for-pickup notification triggers when order status changes.
6. Pickup completion is recorded by staff/owner.

## Notification workflow
### MVP notifications
- order confirmation
- pickup reminder
- ready for pickup

### Delivery for later
Do not make delivery orchestration a blocker for MVP backend logic.
Keep notification service generic enough that delivery events can be added later.

## Multi-tenant rules
- every shop-scoped resource must carry shop_id
- owner/staff access must be limited to their own shop
- customer data access must be limited to relevant orders/designs
- admin role can bypass tenant boundaries only for support/platform operations

## API shape suggestion
### Customer-facing
- POST /auth/login
- GET /shops/:shopId/templates
- POST /designs
- GET /designs/me
- POST /orders
- GET /orders/me

### Owner/staff-facing
- GET /owner/orders
- GET /owner/orders/:id
- PATCH /owner/orders/:id/status
- GET /owner/templates
- PATCH /owner/templates/:id
- GET /owner/pickup-slots
- PATCH /owner/pickup-slots/:id

### Admin-facing
- GET /admin/shops
- GET /admin/subscriptions
- GET /admin/disputes
- GET /admin/analytics

## Build order recommendation
### Backend MVP phase 1
- auth
- shop model
- template model
- pricing engine
- order creation
- order status updates
- pickup slots

### Backend MVP phase 2
- saved designs
- notification events
- staff invites and permissions
- billing automation basics

### Later
- delivery integrations
- deeper analytics
- AI assistance
- marketplace expansion

## Risks to avoid
- making delivery a required first-class dependency too early
- mixing live template data with historical order data
- weak tenant isolation
- unclear role boundaries
- overbuilding admin complexity before shop workflow works

## Clean summary
The backend MVP should not try to do everything.
It should reliably support the customer-to-pickup loop, with saved designs, owner workflow, role separation, and shop isolation built in from the start.