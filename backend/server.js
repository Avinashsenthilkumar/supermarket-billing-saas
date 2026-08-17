// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sequelize, Shop, User } = require("./models");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) =>
  res.json({ status: "OK", timestamp: new Date() }),
);

// ── Serve React Frontend in Production ──────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(buildPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// ── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Database Sync & Seed ─────────────────────────────────────────────────────
// Creates a default shop + owner so the very first login works, and so any
// legacy rows that were back-filled to shop_id = 1 have a shop to belong to.
const seedDefaultShopAndAdmin = async () => {
  try {
    let shop = await Shop.findByPk(1);
    if (!shop) {
      shop = await Shop.create({
        id: 1,
        name: process.env.DEFAULT_SHOP_NAME || "My Shop",
        ownerEmail: process.env.ADMIN_EMAIL || "admin@supermarket.com",
        plan: "pro",
        subscriptionEnds: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
      console.log("✅ Default shop created");
    }

    const existing = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || "admin@supermarket.com" },
    });
    if (!existing) {
      await User.create({
        shopId: shop.id,
        username: process.env.ADMIN_USERNAME || "admin",
        email: process.env.ADMIN_EMAIL || "admin@supermarket.com",
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "owner",
      });
      console.log("✅ Admin owner created");
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
    await sequelize.sync({ alter: true, force: false });
    console.log("✅ Models synced");
    await seedDefaultShopAndAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
