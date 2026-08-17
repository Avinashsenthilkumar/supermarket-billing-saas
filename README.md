# 🛒 SuperMart — Billing System

A full-stack supermarket billing application with barcode scanning, stock management, and invoice generation.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Tailwind CSS, Recharts    |
| Backend  | Node.js, Express, Sequelize ORM     |
| Database | MySQL 8.0                           |
| Scanner  | html5-qrcode (device camera)        |
| PDF      | PDFKit                              |
| Auth     | JWT (jsonwebtoken + bcryptjs)       |

---

## Project Structure

```
supermarket/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize connection
│   ├── controllers/
│   │   ├── authController.js    # Login, me, change password
│   │   ├── billingController.js # Create/get/cancel bills
│   │   ├── invoiceController.js # PDF generation
│   │   ├── productController.js # CRUD + barcode scan
│   │   └── reportsController.js # Dashboard, sales, top products
│   ├── middleware/
│   │   ├── auth.js              # JWT protect middleware
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── index.js             # Associations
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Bill.js
│   │   └── BillItem.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bills.js
│   │   ├── products.js
│   │   └── reports.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── components/
│       │   ├── auth/
│       │   │   ├── Login.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   ├── billing/
│       │   │   ├── Billing.jsx       # Scanner + Cart
│       │   │   └── Transactions.jsx  # History
│       │   ├── dashboard/
│       │   │   ├── Dashboard.jsx     # Manager overview
│       │   │   └── Reports.jsx       # Analytics
│       │   ├── stock/
│       │   │   └── Stock.jsx         # Product CRUD
│       │   └── shared/
│       │       ├── BarcodeScanner.jsx
│       │       ├── Layout.jsx
│       │       ├── Sidebar.jsx
│       │       └── UI.jsx            # Reusable components
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── services/
│       │   └── api.js
│       ├── utils/
│       │   └── helpers.js
│       ├── App.jsx
│       ├── index.css
│       └── index.js
│
├── schema.sql                   # MySQL DDL
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### 1. Database Setup

```bash
mysql -u root -p
CREATE DATABASE supermarket_db CHARACTER SET utf8mb4;
EXIT;

# Or use the schema file directly:
mysql -u root -p < schema.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and JWT secret
npm install
npm run dev     # Development (nodemon)
# OR
npm start       # Production
```

The server auto-syncs models and seeds the admin user on first run.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start       # Development server on :3000
# OR
npm run build   # Production build
```

### 4. Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=supermarket_db
DB_USER=root
DB_PASSWORD=yourpassword
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=24h
ADMIN_EMAIL=admin@supermarket.com
ADMIN_PASSWORD=admin123
NODE_ENV=development
```

### Default Login

| Field    | Value                     |
|----------|---------------------------|
| Email    | admin@supermarket.com     |
| Password | admin123                  |

---

## API Documentation

**Base URL:** `http://localhost:5000/api`  
All protected routes require: `Authorization: Bearer <token>`

---

### Auth

| Method | Endpoint                    | Auth | Description         |
|--------|-----------------------------|------|---------------------|
| POST   | /auth/login                 | ✗    | Admin login         |
| GET    | /auth/me                    | ✓    | Get current user    |
| PUT    | /auth/change-password       | ✓    | Change password     |

**POST /auth/login**
```json
{ "email": "admin@supermarket.com", "password": "admin123" }
```

---

### Products

| Method | Endpoint                        | Auth | Description             |
|--------|---------------------------------|------|-------------------------|
| GET    | /products                       | ✓    | List products (paginated)|
| POST   | /products                       | ✓    | Create product          |
| GET    | /products/:id                   | ✓    | Get by ID/barcode       |
| PUT    | /products/:id                   | ✓    | Update product          |
| DELETE | /products/:id                   | ✓    | Soft delete             |
| PATCH  | /products/:id/stock             | ✓    | Update stock qty        |
| GET    | /products/barcode/:barcode      | ✓    | Get by barcode          |
| POST   | /products/scan                  | ✓    | Scan: create or add qty |
| GET    | /products/categories            | ✓    | Get unique categories   |

**Query params for GET /products:**
- `search` — name/barcode/category
- `page`, `limit`
- `category`
- `active` — true/false

**POST /products/scan** (create or update stock by barcode)
```json
{
  "barcode": "123456789",
  "quantity": 10,
  "name": "Required only if new product",
  "price": 25.00,
  "category": "Snacks"
}
```

---

### Bills

| Method | Endpoint              | Auth | Description                    |
|--------|-----------------------|------|--------------------------------|
| GET    | /bills                | ✓    | List bills (paginated, filtered)|
| POST   | /bills                | ✓    | Create bill (deducts stock)    |
| GET    | /bills/:id            | ✓    | Get bill with items            |
| PATCH  | /bills/:id/cancel     | ✓    | Cancel + restore stock         |
| GET    | /bills/:id/invoice    | ✓    | Download PDF invoice           |

**POST /bills**
```json
{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ],
  "paymentMethod": "cash",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "taxRate": 5,
  "discountAmount": 10,
  "notes": "Regular customer"
}
```

---

### Reports

| Method | Endpoint                  | Auth | Description                     |
|--------|---------------------------|------|---------------------------------|
| GET    | /reports/dashboard        | ✓    | Full dashboard data             |
| GET    | /reports/sales            | ✓    | Sales report (filterable)       |
| GET    | /reports/top-products     | ✓    | Top selling products            |

Query params: `startDate`, `endDate`, `limit`

---

## Features

### Billing Dashboard
- 📷 Live barcode scanner using device camera (html5-qrcode)
- 🔍 Manual search by name, barcode, or serial number
- 🛒 Cart with quantity control and real-time totals
- 💰 Tax, discount, and multiple payment methods
- 🧾 PDF invoice generation and download

### Stock Dashboard
- ➕ Add, edit, soft-delete products
- 📦 Scan-to-update stock (auto-creates new products)
- ⚠️ Low stock alerts on dashboard
- 🏷️ Categories, barcode, serial number fields

### Manager Dashboard
- 📊 Daily and monthly revenue stats
- 📈 7-day revenue area chart
- 🔄 Recent transactions list
- 📉 Low stock alerts widget

### Reports
- 🏆 Top-selling products (by units + revenue)
- 📊 Bar chart + pie chart visualization
- 📅 Date range filters

### Transactions
- 📋 Full bill history with filters
- 🔍 Bill detail view with line items
- ❌ Bill cancellation with automatic stock restoration
- 📄 Per-bill PDF invoice

---

## Key Design Decisions

- **Soft delete** for products — historical bill data stays intact
- **Stock deduction** happens atomically during bill creation
- **Stock restoration** on bill cancellation via DB transaction
- **Bill snapshot** — product name/price stored at billing time
- JWT token validation on every request
- Debounced search to minimize API calls
