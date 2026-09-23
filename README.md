# SuperMart POS — Multi-business Supermarket Billing SaaS

Sell one app to many supermarkets. **Every business gets its own private MySQL database** —
products, bills, customers and settings of one shop never share tables with another.

```
                 ┌──────────────────────────┐
  login ───────► │  supermart_master (DB)   │  shops, user logins, plans, platform settings
                 └────────────┬─────────────┘
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   sm_shop_1 (DB)       sm_shop_2 (DB)      sm_shop_3 (DB)   ← created automatically on signup
   products, bills,     products, bills,    products, bills,
   customers, settings  customers, settings customers, settings
```

## Features

**Billing (POS)** — barcode scan (USB scanner / camera) or search · keyboard shortcuts (F2 search, F4 hold, F9 checkout) ·
loose items by kg/litre · item & bill discounts · GST per product (inclusive or exclusive, CGST/SGST split) · round-off ·
cash / UPI / card / split payment with change calculation · credit (udhaar) sales with credit limit ·
loyalty points earn & redeem · hold / resume bills · thermal 58mm / 80mm / A4 receipt printing + PDF invoice.

**Sales** — history with filters, returns (partial, restock or not, refund / adjust due / store credit), cancellation with reason.

**Inventory** — products with MRP, selling & cost price, GST, HSN, unit, brand, reorder level, expiry, batch, rack ·
low stock & expiry alerts · stock adjustments with reason · full stock movement history · bulk import (CSV/Excel) ·
barcode label printing · purchases (GRN) from suppliers that update stock & cost price · supplier payables & payments.

**Customers** — auto-saved from bills · dues collection (oldest bill first) · WhatsApp due reminder · loyalty adjustment.

**Business** — expenses · staff logins with roles (Owner / Manager / Cashier) · day closing with cash count ·
reports: sales, busy hours, payment methods, top products, categories, GST (rate-wise + HSN, input vs output),
profit & loss, staff performance, stock movement, expiry — all exportable to CSV.

**Settings (per business, owner only)** — business name, logo, address, GSTIN, FSSAI · **theme light / dark / system** ·
**brand colour for the whole site** · sidebar style · text size · compact mode · tax rules · bill prefixes ·
payment methods · receipt layout & text · categories / units / expense categories · loyalty rules · cashier permissions.

**Platform Admin (super admin)** — overview of all businesses · create business (with its own DB) · change plan / extend
validity / deactivate · reset owner password · open any shop for support · verify or delete a shop database ·
**Settings tab**: platform name, tagline, support contact, default theme & colour for new shops, signup on/off,
trial days, plan limits (users / products) and prices.

## Quick start (local)

Requirements: Node 18+, MySQL 8 (or MariaDB 10.5+). The DB user needs permission to **CREATE DATABASE**.

```bash
# 1. Backend
cd backend
cp .env.example .env        # set DB_PASSWORD and JWT_SECRET
npm install
npm start                   # creates supermart_master + sm_shop_1 automatically

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                   # http://localhost:3000  (proxies /api to :5000)
```

Login: `admin@supermarket.com` / `admin123` (change it in Settings → My Account).
New businesses can sign up at `/signup` (turn off in Admin → Settings).

## Moving data from the old version

The old app stored every shop in one database (`supermarket_db`). Keep it as it is and run:

```bash
cd backend
# .env:  DB_NAME=supermart_master   LEGACY_DB_NAME=supermarket_db
npm run migrate:legacy
```

Each old shop becomes a business with its own database; users keep their passwords;
products, bills and bill items keep their IDs; customers are created from bill phone numbers.
Re-running is safe (shops that already have products are skipped; `--force` to override).

## Deployment

* **Single server (Railway / Render / VPS):** `npm run build` at the repo root builds the React app,
  `npm start` runs the API and serves the build when `NODE_ENV=production`.
* **Docker:** `docker compose up --build` → app on http://localhost:3000.
* Frontend on a different domain: build with `REACT_APP_API_URL=https://api.yourdomain.com/api`
  and set `CORS_ORIGIN` on the backend.

After upgrading the code later (new columns), start once with `DB_SYNC_ALTER=true`, then set it back to `false`.

## Roles

| Area | Owner | Manager | Cashier |
|---|:-:|:-:|:-:|
| Billing, sales history, customers, day closing | ✓ | ✓ | ✓ |
| Stock, purchases, suppliers, barcodes, expenses, reports | ✓ | ✓ | |
| Profit & loss report, staff, shop settings | ✓ | | |
| Discounts / cancel bill for cashiers | configurable in Settings → Billing & Tax |||

## Tests

```bash
cd backend && npm test      # bill maths: GST, discounts, round-off, split payments, change
```

## Project structure

```
backend/
  config/database.js        master connection + CREATE DATABASE helpers
  tenant/tenantManager.js   one cached connection per business, auto-create DB/tables, idle cleanup
  models/master/            Shop, User, PlatformSetting
  models/tenant/            Product, Supplier, StockMovement, Customer, Bill, BillItem, HeldBill,
                            SaleReturn(+Item), CustomerPayment, Purchase(+Item), SupplierPayment, Setting, Expense
  controllers/ routes/      REST API (/api/…)
  utils/billMath.js         bill calculation (shared with the frontend)
  scripts/migrate-legacy.js old single-DB → database-per-business
frontend/src/
  context/                  Auth + Settings (theme engine applies colours/dark mode everywhere)
  components/               billing, dashboard, stock, inventory, customers, business, settings, admin
```
