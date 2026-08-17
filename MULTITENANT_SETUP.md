# SaaS (Multi-Tenant) Conversion — Setup Guide

Your app is now **multi-tenant**: multiple shops can sign up and each shop only
ever sees its own products, bills, stock, customers and reports. This is the
foundation of a SaaS product.

---

## What changed

**New**
- `backend/models/Shop.js` — the tenant. Holds shop name, plan, subscription.
- `backend/migrations/001_add_multitenancy.sql` — migrates your existing DB.
- `frontend/src/components/auth/Signup.jsx` — public signup page (`/signup`).

**Core change: `shop_id` everywhere**
- `User`, `Product`, `Bill` now each have a `shopId`.
- **Every** database query in every controller is now filtered by the logged-in
  user's `shopId`. This is what keeps one shop's data invisible to another.
- `barcode`, `serial_number`, `bill_number`, `username` are now unique **per
  shop** instead of globally (two shops can both have the same barcode).

**Auth**
- `POST /api/auth/register` — new signup. Creates a Shop + owner user together,
  starts a 14-day free trial, returns a token.
- `login` / `me` now also return the shop (name, plan, trial end date).
- `middleware/auth.js` loads the shop and blocks inactive shops. It also exports
  `requireActiveSubscription` and `requireOwner` guards you can apply later.

**Invoice** now uses the shop's own name/address/phone instead of a hardcoded one.

---

## Deploy steps (do these in order)

### 1. Run the migration on your Railway MySQL — FIRST
Open Railway → your MySQL service → the query/data console, and run the whole of
`backend/migrations/001_add_multitenancy.sql`.

It creates the `shops` table, makes a default shop (`id = 1`), and attaches all
your **existing** products/bills/users to it. Your current data is safe and ends
up under "My Shop".

> A couple of the `DROP INDEX` lines may error if that index doesn't exist on
> your DB — that's fine, just ignore those specific errors and continue.

### 2. Deploy the new backend + frontend code
Push to the repo Railway builds from. On boot the server will `sync` the models
(columns already exist from step 1) and seed the default shop/owner if missing.

### 3. Test
- Log in with your existing admin account → you should see all your old data.
- Go to `/signup`, create a **second** shop with a different email.
- Confirm the second shop starts empty and can't see the first shop's products.

---

## Environment variables (backend `.env`)
Existing ones stay. Optionally add:

```
TRIAL_DAYS=14                 # free trial length for new signups
DEFAULT_SHOP_NAME=My Shop     # name for the migrated legacy shop
```

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` etc. work as before.

---

## What to build next (in order)

1. **Payments (Razorpay).** Add a `POST /api/billing/subscribe` that creates a
   Razorpay order, and a webhook that on success sets `shop.plan` and
   `shop.subscriptionEnds`. Then apply the `requireActiveSubscription` middleware
   (already written in `middleware/auth.js`) to the routes you want to gate.
2. **Plan limits.** e.g. free plan = max 100 products. Check count against
   `shop.plan` in `createProduct`.
3. **Staff users.** Let an owner invite `staff` users to their shop (role already
   exists; `requireOwner` guard already written).
4. **Landing + pricing page** and a **super-admin panel** to manage all shops.

---

## Safety note
The one rule that keeps tenants isolated: **never query a tenant table without
`shopId`.** Every new endpoint you add must include `shopId: req.shopId` in its
`where` clause (or `req.user.shopId`). If you forget it on even one query, that
endpoint leaks data across shops.
