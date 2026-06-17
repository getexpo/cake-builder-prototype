# Architecture Outline - Cake Shop Platform

## Core layers

### 1. Frontend
- Customer web app
- Owner dashboard web app
- Shared design system

### 2. Backend
- Auth service
- Shop management
- Product/template service
- Order service
- Pricing engine
- Notification service

### 3. Data model
- Shops
- Users
- Roles
- Cake templates
- Ingredient groups
- Ingredient options
- Orders
- Saved designs
- Pickup slots
- Notification events
- Staff invitations

### 4. Infrastructure
- Multi-tenant architecture
- Database
- File storage
- Background jobs
- Scheduled tasks
- Admin monitoring

## Likely stack
- React frontend
- Node backend
- Postgres database
- Cloud file storage
- Stripe for payments
- Twilio/email for notifications

## Early principle
Keep delivery as an optional module, not a core blocker for MVP.