// server.js — SuperMart POS SaaS API
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { createDatabaseIfMissing } = require("./config/database");
const { sequelize, Shop, User, PlatformSetting } = require("./models/master");
const { provisionTenant, dbNameForShop, closeAll, stats } = require("./tenant/tenantManager");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { PLATFORM_DEFAULTS } = require("./utils/defaults");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
const origins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.disable("x-powered-by");

// ── API Routes ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date(), tenants: stats().openConnections }));
app.use("/api/platform", require("./routes/platform"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/reports", require("./routes/reports"));

// ── Serve the React build (single-server deployments) ───────────────────────
const buildPath = path.join(__dirname, "../frontend/build");
if (process.env.NODE_ENV === "production" && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
// Creates the platform settings row, the platform-admin shop and the super admin.
const seed = async () => {
  await PlatformSetting.findOrCreate({ where: { id: 1 }, defaults: { id: 1, data: PLATFORM_DEFAULTS } });

  const adminEmail = String(process.env.ADMIN_EMAIL || "admin@supermarket.com").toLowerCase();
  let admin = await User.findOne({ where: { email: adminEmail } });
  let shop = admin ? await Shop.findByPk(admin.shopId) : await Shop.findOne({ order: [["id", "ASC"]] });

  if (!shop) {
    shop = await Shop.create({
      name: process.env.DEFAULT_SHOP_NAME || "Demo Supermarket",
      ownerEmail: adminEmail,
      plan: "pro",
      subscriptionEnds: null, // lifetime
      isActive: true,
    });
    console.log("✅ Default shop created");
  }
  if (!shop.dbName) {
    shop.dbName = dbNameForShop(shop.id);
    await shop.save();
  }

  if (!admin) {
    admin = await User.create({
      shopId: shop.id,
      username: process.env.ADMIN_USERNAME || "Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || "admin123",
      role: "owner",
      isSuperAdmin: true,
    });
    console.log(`✅ Super admin created → ${adminEmail}`);
  } else if (!admin.isSuperAdmin) {
    admin.isSuperAdmin = true;
    await admin.save();
  }

  await provisionTenant(shop, { businessName: shop.name });
  console.log(`✅ Default shop database ready (${shop.dbName})`);
};

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing in .env");
    await createDatabaseIfMissing(process.env.DB_NAME || "supermart_master");
    await sequelize.authenticate();
    console.log("✅ Master database connected");
    await sequelize.sync(process.env.DB_SYNC_ALTER === "true" ? { alter: true } : {});
    await seed();
    const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    const shutdown = async (sig) => {
      console.log(`\n${sig} received — closing…`);
      server.close();
      await closeAll();
      await sequelize.close();
      process.exit(0);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    if (/Access denied|ER_DBACCESS|CREATE command denied/i.test(error.message)) {
      console.error("   → The DB user needs permission to CREATE DATABASE (each shop gets its own database).");
    }
    process.exit(1);
  }
};

if (require.main === module) start();

module.exports = app;
