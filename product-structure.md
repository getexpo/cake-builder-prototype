# Cake Shop Platform - Product Structure

## Core idea
A multi-tenant platform for cake shops that handles the full lifecycle:
1. help customers design and order cakes
2. help cake shops manage production and orders
3. help fulfill pickup or delivery end to end

---

## Pillar 1: Order Creation

### Customer experience
- Browse shop or start with a cake template
- Build a cake visually
- Choose size, base, sponge, sweetener, cream, filling, toppings, decorations
- See live visual preview
- See live pricing updates
- Add custom message or special instructions
- Save draft design
- Favorite/save cake design
- Reload saved designs back into the builder
- Reorder past cakes

### Checkout flow
- Add to cart
- Choose pickup or delivery
- Select date/time slot
- Enter recipient details if gifting
- Pay deposit or full amount
- Receive confirmation

### Customer account features
- Sign up / log in
- Google login
- Phone login
- Order history
- Saved addresses
- Favorites and saved designs

---

## Pillar 2: Shop Operations

### Owner / staff accounts
- Shop owner account
- Staff accounts
- Permissions / roles
- Multi-shop isolation so each business sees only its own data

### Cake builder management
- Create cake templates
- Define ingredient groups
- Define options under each group
- Set which options are customer-editable
- Set pricing rules by ingredient, size, tier, decoration
- Upload reference visuals or preview assets

### Order operations
- Receive incoming orders
- Accept / reject / modify order
- Track order stages:
  - new
  - confirmed
  - baking
  - decorating
  - ready
  - out for delivery
  - completed
- Assign pickup times
- Add internal notes
- Handle cancellations / refunds

### Shop settings
- Shop profile
- Branding
- Pickup hours
- Delivery radius
- Lead times
- Holiday closures
- Tax settings
- Payment settings

### Business analytics
- Orders per day/week/month
- Revenue
- Average order value
- Top cake types
- Popular ingredient combinations
- Repeat customer rate

---

## Pillar 3: Fulfillment & Delivery

### Pickup flow
- Pickup scheduling
- Pickup confirmation
- Customer notification when ready
- Pickup completed tracking

### Delivery flow
- Delivery address capture
- Delivery fee calculation
- Delivery time windows
- Live delivery status
- Proof of delivery
- Failed delivery handling

### Delivery models
- Third-party integration path:
  - Uber Direct
  - DoorDash Drive
  - Skip / other local delivery partners
- Internal driver network path:
  - driver signup
  - driver assignment
  - dispatching
  - payout logic

### Driver / courier operations
- Assign driver
- Track driver status
- Notify customer and shop
- Mark delivered
- Handle issues/damage/escalations

---

## Platform Infrastructure Layer

### SaaS / multi-tenant foundation
- Each cake shop has its own account/workspace
- Data separation between shops
- Subscription plans
- Trial / onboarding flow
- Admin dashboard for platform operator

### Authentication
- Email login
- Google login
- Phone login
- Password reset
- Role-based access

### Payments
- Customer checkout payments
- Deposits vs full payment
- Shop payouts
- Platform fees
- Subscription billing for shop owners

### Notifications
- Order confirmation
- Pickup reminder
- Delivery updates
- Owner new-order alerts
- Status change alerts
- SMS / email / push options

### Admin / support tools
- View all shops
- Handle disputes
- Refund support
- Monitor delivery issues
- Manage subscriptions
- Platform-wide analytics

---

## Business Model Layer

### Revenue options
- Monthly SaaS fee per shop
- Per-order transaction fee
- Delivery margin
- Premium features / higher plans

### Key metrics to model
- Number of shops
- Orders per shop per month
- Average order value
- Delivery attach rate
- Platform take rate
- Subscription revenue
- Gross margin

---

## MVP vs Later

## MVP
- Customer cake builder
- Live preview
- Basic pricing logic
- Cart and checkout
- Pickup flow
- Owner dashboard
- Ingredient/template management
- Order management
- Multi-tenant shop accounts
- Basic auth

## Phase 2
- Saved designs / favorites
- Delivery integrations
- Staff roles
- Better analytics
- More advanced preview logic
- Customer account improvements
- Deposits / split payments

## Phase 3
- Internal driver network
- Marketplace layer
- Advanced customization
- Drag/drop decorations
- AI cake suggestions
- Platform-wide optimization tools

---

## Investor / Demo Framing

This product is not just a cake ordering app.

It is:
- a customer cake configurator
- a cake shop operating system
- a fulfillment layer for custom cake orders
- a multi-tenant SaaS business for bakery owners

---

## Clean summary

### Pillar 1: Order Creation
Help customers design and buy cakes.

### Pillar 2: Shop Operations
Help cake shops manage customization, production, and orders.

### Pillar 3: Fulfillment & Delivery
Help cakes get picked up or delivered reliably.

### Foundation Layer
Auth, payments, notifications, SaaS billing, admin, and multi-tenant infrastructure.
