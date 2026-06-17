# Owner / Backend Scope - Cake Shop Platform

## Goal
Define the business owner side and platform backend clearly enough that the product can be built as a real SaaS, not just a front-end demo.

## Owner-side core modules

### 1. Authentication and access
- Owner signup
- Owner login
- Google login
- Phone login
- Password reset
- Staff invites
- Role permissions

### 2. Shop workspace
- Shop profile
- Branding
- Logo and theme
- Location info
- Pickup settings
- Delivery settings
- Business hours
- Holiday closures

### 3. Cake builder management
- Create cake templates
- Create occasion templates
- Define max layer counts
- Define size presets
- Define cake types
- Define ingredient groups
- Define ingredient options
- Set per-option pricing
- Set premium upsell options

### 4. Order management
- New orders dashboard
- Accept / reject orders
- Edit order details
- Production status updates
- Pickup / delivery assignment
- Customer notes and communication
- Refund / cancellation handling

### 5. Customer management
- Customer profiles
- Saved designs
- Order history
- Favorite orders
- Repeat customer insights

### 6. Billing and subscriptions
- Shop subscription plan
- Payment method on file
- Monthly billing
- Upgrade/downgrade plan
- Commission / take-rate settings
- Payout reporting

### 7. Analytics
- Revenue dashboard
- Orders by day/week/month
- Average order value
- Top templates
- Popular ingredient combos
- Repeat rate

## Platform backend modules

### Multi-tenant architecture
- Each shop isolated
- Shop-level data ownership
- Shared platform admin layer
- Permission-aware access control

### Services needed
- Auth service
- Shop service
- Template service
- Pricing engine
- Order service
- Notification service
- Billing service
- Analytics service

### Admin platform side
- All shops overview
- Subscription monitoring
- Support tools
- Refund/dispute tools
- Delivery issue monitoring
- Platform analytics

## Prototype coverage now visible

The current prototype direction now visibly represents:
- customer builder mode split between simple and advanced
- saved designs and favorites for customer return flows
- owner dashboard modules for orders builder settings customers and billing
- order workflow stages from new order to pickup plus order detail and status actions
- platform admin portal concepts including shops billing disputes and analytics

This is still product-structure proof, not a production backend. The next gap is turning these visible modules into real data-backed flows.

## Build priority

### MVP backend priority
- Auth
- Shop workspace
- Template management
- Pricing engine
- Order management
- Multi-tenant separation

### Phase 2 backend priority
- Staff permissions
- Advanced analytics
- Saved designs sync
- Better notification rules
- Billing automation improvements

### Phase 3 backend priority
- Internal driver network
- Marketplace functions
- AI recommendations
- Advanced demand forecasting
