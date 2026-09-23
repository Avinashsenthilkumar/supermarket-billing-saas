// scripts/migrate-legacy.js
// ─────────────────────────────────────────────────────────────────────────────
// Moves data from the OLD single-database app (all shops in one DB with shop_id)
// into the NEW structure: master DB + one private database per shop.
//
//   1. Keep your old database (default name: supermarket_db) untouched.
//   2. In .env set DB_NAME to the NEW master name (e.g. supermart_master)
//      and LEGACY_DB_NAME to the old database name.
//   3. Run once:   npm run migrate:legacy
//      (safe to re-run: shops that already have products are skipped unless --force)
// ─────────────────────────────────────────────────────────────────────────────
require("dotenv").config();
const { Sequelize, QueryTypes } = require("sequelize");
const { sequelize: master, createDatabaseIfMissing } = require("../config/database");
const { Shop, User, PlatformSetting } = require("../models/master");
const { getTenant, dbNameForShop, closeAll } = require("../tenant/tenantManager");
const { PLATFORM_DEFAULTS } = require("../utils/defaults");

const FORCE = process.argv.includes("--force");
const LEGACY = process.env.LEGACY_DB_NAME || "supermarket_db";
const ROLE_MAP = { owner: "owner", staff: "cashier", manager: "manager", cashier: "cashier" };
const STATUS_MAP = { completed: "completed", cancelled: "cancelled", refunded: "returned" };

const legacy = new Sequelize(LEGACY, process.env.DB_USER || "root", process.env.DB_PASSWORD || "", {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  dialect: "mysql",
  logging: false,
  timezone: "+00:00",
  dialectOptions: { decimalNumbers: true },
});

const q = (sql, replacements = {}) => legacy.query(sql, { replacements, type: QueryTypes.SELECT });
const hasTable = async (name) => (await q("SHOW TABLES LIKE :name", { name })).length > 0;
const n = (v) => Number(v) || 0;

async function migrateShop(legacyShop, adminEmail) {
  const users = await q("SELECT * FROM users WHERE shop_id = :id", { id: legacyShop.id });
  console.log(`\n▶ ${legacyShop.name} (legacy id ${legacyShop.id}) — ${users.length} users`);

  // 1) Find or create the shop in the master DB
  const emails = users.map((u) => String(u.email).toLowerCase());
  let shop = null;
  const existingUser = emails.length ? await User.findOne({ where: { email: emails } }) : null;
  if (existingUser) shop = await Shop.findByPk(existingUser.shopId);
  if (!shop) {
    shop = await Shop.create({
      name: legacyShop.name,
      ownerEmail: String(legacyShop.owner_email || emails[0] || `shop${legacyShop.id}@example.com`).toLowerCase(),
      phone: legacyShop.phone || null,
      address: legacyShop.address || null,
      plan: legacyShop.plan || "free",
      subscriptionEnds: legacyShop.subscription_ends || null,
      isActive: legacyShop.is_active === undefined ? true : !!legacyShop.is_active,
    });
    shop.dbName = dbNameForShop(shop.id);
    await shop.save();
    console.log(`  + created master shop #${shop.id}`);
  } else {
    console.log(`  = using existing master shop #${shop.id} (${shop.name})`);
  }
  if (!shop.dbName) {
    shop.dbName = dbNameForShop(shop.id);
    await shop.save();
  }

  // 2) Users — copy password hashes as-is (hooks off so they are not re-hashed)
  for (const u of users) {
    const email = String(u.email).toLowerCase();
    if (await User.findOne({ where: { email } })) continue;
    await User.create(
      {
        shopId: shop.id,
        username: u.username || "User",
        email,
        password: u.password,
        role: ROLE_MAP[u.role] || "cashier",
        isActive: u.isActive === undefined ? true : !!u.isActive,
        isSuperAdmin: email === adminEmail,
      },
      { hooks: false },
    );
    console.log(`  + user ${email}`);
  }

  // 3) Tenant database
  const tenant = await getTenant(shop, {
    businessName: legacyShop.name,
    phone: legacyShop.phone || "",
    address: legacyShop.address || "",
    gstNumber: legacyShop.gst_number || "",
  });
  const qi = tenant.sequelize.getQueryInterface();
  const tq = (sql, replacements = {}) => tenant.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  const [{ c: existingProducts }] = await tq("SELECT COUNT(*) AS c FROM products");
  if (existingProducts > 0 && !FORCE) {
    console.log(`  ! ${shop.dbName} already has ${existingProducts} products — skipped (use --force to import anyway)`);
    return;
  }

  // 4) Products (same ids so bill items still point to them)
  const products = await q("SELECT * FROM products WHERE shop_id = :id", { id: legacyShop.id });
  const now = new Date();
  if (products.length) {
    await qi.bulkInsert(
      "products",
      products.map((p) => {
        const net = p.description && String(p.description).startsWith("Net Qty:");
        return {
          id: p.id,
          name: p.name || "Unnamed",
          barcode: p.barcode || null,
          serial_number: p.serial_number || null,
          category: p.category || null,
          unit: "pcs",
          allow_decimal: false,
          net_qty: net ? String(p.description).replace("Net Qty:", "").trim() : null,
          tax_rate: 0,
          mrp: p.mrp === null || p.mrp === undefined ? null : n(p.mrp),
          price: n(p.price),
          cost_price: 0,
          quantity: n(p.quantity),
          reorder_level: 10,
          expiry_date: p.expiry_date || null,
          description: net ? null : p.description || null,
          is_active: p.is_active === undefined ? true : !!p.is_active,
          createdAt: p.createdAt || now,
          updatedAt: p.updatedAt || now,
        };
      }),
    );
    await qi.bulkInsert(
      "stock_movements",
      products
        .filter((p) => n(p.quantity) !== 0)
        .map((p) => ({ product_id: p.id, product_name: p.name, type: "opening", quantity: n(p.quantity), balance_after: n(p.quantity), note: "Migrated from old system", createdAt: now })),
    );
  }
  console.log(`  + ${products.length} products`);

  // 5) Customers from bill phone numbers
  const bills = await q("SELECT * FROM bills WHERE shop_id = :id ORDER BY id", { id: legacyShop.id });
  const phones = new Map();
  bills.forEach((b) => {
    const phone = String(b.customer_phone || "").trim();
    if (phone && !phones.has(phone)) phones.set(phone, b.customer_name || "Customer");
  });
  let custId = 0;
  const custIds = new Map();
  if (phones.size) {
    const rows = [...phones.entries()].map(([phone, name]) => {
      custId += 1;
      custIds.set(phone, custId);
      return { id: custId, name: String(name).slice(0, 120) || "Customer", phone: phone.slice(0, 20), createdAt: now, updatedAt: now };
    });
    await qi.bulkInsert("customers", rows);
  }
  console.log(`  + ${phones.size} customers`);

  // 6) Bills + items
  if (bills.length) {
    await qi.bulkInsert(
      "bills",
      bills.map((b) => {
        const phone = String(b.customer_phone || "").trim();
        const total = n(b.total_amount);
        return {
          id: b.id,
          bill_number: b.bill_number,
          customer_id: custIds.get(phone) || null,
          customer_name: b.customer_name || null,
          customer_phone: phone || null,
          subtotal: n(b.subtotal),
          discount_amount: n(b.discount_amount),
          taxable_amount: Math.max(0, n(b.subtotal) - n(b.discount_amount)),
          tax_amount: n(b.tax_amount),
          cgst: Math.round((n(b.tax_amount) / 2) * 100) / 100,
          sgst: n(b.tax_amount) - Math.round((n(b.tax_amount) / 2) * 100) / 100,
          total_amount: total,
          paid_amount: total,
          payment_method: b.payment_method || "cash",
          payments: JSON.stringify([{ method: b.payment_method || "cash", amount: total }]),
          prices_include_tax: false,
          status: STATUS_MAP[b.status] || "completed",
          notes: b.notes || null,
          cashier_name: "migrated",
          createdAt: b.createdAt || now,
          updatedAt: b.updatedAt || now,
        };
      }),
    );
    const billIds = bills.map((b) => b.id);
    const items = await q("SELECT * FROM bill_items WHERE bill_id IN (:ids)", { ids: billIds });
    if (items.length) {
      for (let i = 0; i < items.length; i += 1000) {
        await qi.bulkInsert(
          "bill_items",
          items.slice(i, i + 1000).map((it) => ({
            id: it.id,
            bill_id: it.bill_id,
            product_id: it.product_id,
            product_name: it.product_name || "Item",
            product_barcode: it.product_barcode || null,
            unit: "pcs",
            unit_price: n(it.unit_price),
            quantity: n(it.quantity),
            tax_rate: 0,
            taxable_amount: n(it.total_price),
            total_price: n(it.total_price),
            createdAt: it.createdAt || now,
            updatedAt: it.updatedAt || now,
          })),
        );
      }
    }
    console.log(`  + ${bills.length} bills, ${items.length} bill items`);

    // Customer totals
    await tenant.sequelize.query(
      `UPDATE customers c SET
         total_spent = COALESCE((SELECT SUM(total_amount) FROM bills b WHERE b.customer_id = c.id AND b.status <> 'cancelled'),0),
         total_bills = COALESCE((SELECT COUNT(*) FROM bills b WHERE b.customer_id = c.id AND b.status <> 'cancelled'),0),
         last_purchase_at = (SELECT MAX(createdAt) FROM bills b WHERE b.customer_id = c.id)`,
    );
  }
  console.log(`  ✔ done → database ${shop.dbName}`);
}

(async () => {
  try {
    console.log(`Legacy DB: ${LEGACY}  →  Master DB: ${process.env.DB_NAME}`);
    if (LEGACY === process.env.DB_NAME) throw new Error("LEGACY_DB_NAME must be different from DB_NAME");
    await legacy.authenticate();
    if (!(await hasTable("shops")) || !(await hasTable("products"))) throw new Error(`"${LEGACY}" does not look like the old app database`);

    await createDatabaseIfMissing(process.env.DB_NAME || "supermart_master");
    await master.authenticate();
    await master.sync();
    await PlatformSetting.findOrCreate({ where: { id: 1 }, defaults: { id: 1, data: PLATFORM_DEFAULTS } });

    const adminEmail = String(process.env.ADMIN_EMAIL || "admin@supermarket.com").toLowerCase();
    const shops = await q("SELECT * FROM shops ORDER BY id");
    for (const s of shops) await migrateShop(s, adminEmail);

    console.log("\n✅ Migration finished. Start the server with: npm start");
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await closeAll();
    await legacy.close().catch(() => {});
    await master.close().catch(() => {});
  }
})();
