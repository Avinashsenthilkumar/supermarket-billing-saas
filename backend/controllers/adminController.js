// controllers/adminController.js — PLATFORM super-admin: manage every business
const { Op } = require("sequelize");
const { Shop, User, PlatformSetting } = require("../models/master");
const { getTenant, closeTenant, stats: tenantStats } = require("../tenant/tenantManager");
const { createDatabaseIfMissing, assertSafeDbName, sequelize: master } = require("../config/database");
const { asyncHandler, HttpError, str, int, num, bool } = require("../utils/helpers");
const { getPlatformSettings, clearPlatformCache } = require("../utils/settings");
const { mergePlatform } = require("../utils/defaults");
const { createShopWithOwner } = require("../utils/shopService");
const { signToken } = require("../middleware/auth");
const { shopPayload } = require("../utils/shopPayload");

// Per-shop numbers come from each shop's own database → cache briefly
const summaryCache = new Map();
const tenantSummary = async (shop) => {
  const hit = summaryCache.get(shop.id);
  if (hit && Date.now() - hit.at < 60000) return hit.value;
  let value = { products: 0, bills: 0, revenue: 0, customers: 0, dbOk: false };
  try {
    const { models } = await getTenant(shop);
    const [products, bills, revenue, customers] = await Promise.all([
      models.Product.count({ where: { isActive: true } }),
      models.Bill.count({ where: { status: { [Op.ne]: "cancelled" } } }),
      models.Bill.sum("totalAmount", { where: { status: { [Op.ne]: "cancelled" } } }),
      models.Customer.count(),
    ]);
    value = { products, bills, revenue: Number(revenue) || 0, customers, dbOk: true };
  } catch (err) {
    value.error = err.message;
  }
  summaryCache.set(shop.id, { value, at: Date.now() });
  return value;
};

// Run async fn over items with limited concurrency
const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
};

const shopRow = async (shop, platform) => {
  const [users, summary] = await Promise.all([User.count({ where: { shopId: shop.id } }), tenantSummary(shop)]);
  return {
    ...shopPayload(shop, platform),
    dbName: shop.dbName,
    ownerEmail: shop.ownerEmail,
    phone: shop.phone,
    address: shop.address,
    businessType: shop.businessType,
    notes: shop.notes,
    createdAt: shop.createdAt,
    users,
    ...summary,
  };
};

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  const shops = await Shop.findAll();
  const summaries = await mapLimit(shops, 5, tenantSummary);
  const now = Date.now();
  const byPlan = {};
  shops.forEach((s) => {
    byPlan[s.plan] = (byPlan[s.plan] || 0) + 1;
  });
  res.json({
    success: true,
    data: {
      totalShops: shops.length,
      activeShops: shops.filter((s) => s.isActive).length,
      inactiveShops: shops.filter((s) => !s.isActive).length,
      expiredShops: shops.filter((s) => s.subscriptionEnds && new Date(s.subscriptionEnds).getTime() < now).length,
      totalUsers: await User.count(),
      totalProducts: summaries.reduce((a, s) => a + s.products, 0),
      totalBills: summaries.reduce((a, s) => a + s.bills, 0),
      totalRevenue: summaries.reduce((a, s) => a + s.revenue, 0),
      totalCustomers: summaries.reduce((a, s) => a + s.customers, 0),
      byPlan,
      plans: platform.plans,
      connections: tenantStats().openConnections,
    },
  });
});

// GET /api/admin/shops
const getShops = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  const where = {};
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    where[Op.or] = [{ name: { [Op.like]: q } }, { ownerEmail: { [Op.like]: q } }, { phone: { [Op.like]: q } }];
  }
  const shops = await Shop.findAll({ where, order: [["createdAt", "DESC"]] });
  const data = await mapLimit(shops, 5, (s) => shopRow(s, platform));
  res.json({ success: true, data: { shops: data } });
});

// GET /api/admin/shops/:id — detail incl. users
const getShop = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  summaryCache.delete(shop.id);
  const users = await User.findAll({ where: { shopId: shop.id }, order: [["createdAt", "ASC"]] });
  res.json({ success: true, data: { shop: await shopRow(shop, platform), users: users.map((u) => u.toSafeJSON()) } });
});

// POST /api/admin/shops
const createShop = asyncHandler(async (req, res) => {
  const { shopName, ownerEmail, username, password, phone, plan, days, address, businessType } = req.body || {};
  const { shop } = await createShopWithOwner({
    shopName,
    email: ownerEmail,
    username,
    password,
    phone,
    plan,
    days: days || 365,
    address,
    businessType,
  });
  res.status(201).json({ success: true, message: "Business created with its own database", data: { shopId: shop.id, dbName: shop.dbName } });
});

// PUT /api/admin/shops/:id — plan, validity, status, details
const updateShop = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  const b = req.body || {};
  if (b.name !== undefined) shop.name = str(b.name, 150) || shop.name;
  if (b.phone !== undefined) shop.phone = str(b.phone, 20);
  if (b.address !== undefined) shop.address = str(b.address, 1000);
  if (b.notes !== undefined) shop.notes = str(b.notes, 2000);
  if (b.plan !== undefined) {
    if (!platform.plans[b.plan]) throw new HttpError(400, "Unknown plan");
    shop.plan = b.plan;
  }
  if (b.subscriptionEnds !== undefined) shop.subscriptionEnds = b.subscriptionEnds ? new Date(b.subscriptionEnds) : null;
  if (b.extendDays) {
    const base = shop.subscriptionEnds && new Date(shop.subscriptionEnds) > new Date() ? new Date(shop.subscriptionEnds) : new Date();
    shop.subscriptionEnds = new Date(base.getTime() + int(b.extendDays) * 86400000);
  }
  if (b.isActive !== undefined) {
    if (shop.id === req.shopId && !bool(b.isActive)) throw new HttpError(400, "You cannot deactivate your own shop");
    shop.isActive = bool(b.isActive);
  }
  await shop.save();

  // keep the business name inside the shop's own settings in sync
  if (b.name !== undefined) {
    try {
      const { models } = await getTenant(shop);
      const row = await models.Setting.findByPk(1);
      if (row) {
        row.data = { ...row.data, businessName: shop.name };
        await row.save();
      }
    } catch {
      /* non-fatal */
    }
  }
  summaryCache.delete(shop.id);
  res.json({ success: true, message: "Shop updated", data: { shop: await shopRow(shop, platform) } });
});

// PATCH /api/admin/shops/:id/toggle
const toggleShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  if (shop.id === req.shopId) throw new HttpError(400, "You cannot deactivate your own shop");
  shop.isActive = !shop.isActive;
  await shop.save();
  res.json({ success: true, message: shop.isActive ? "Shop activated" : "Shop deactivated", data: { isActive: shop.isActive } });
});

// POST /api/admin/shops/:id/reset-password  { userId?, newPassword }
const resetPassword = asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  const newPassword = String(req.body?.newPassword || "");
  if (newPassword.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  const where = req.body?.userId ? { id: req.body.userId, shopId: shop.id } : { shopId: shop.id, role: "owner" };
  const user = await User.findOne({ where, order: [["id", "ASC"]] });
  if (!user) throw new HttpError(404, "User not found");
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: `Password reset for ${user.email}` });
});

// POST /api/admin/shops/:id/login-as — support access: token for the shop owner
const loginAs = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  const owner = await User.findOne({ where: { shopId: shop.id, role: "owner", isActive: true }, order: [["id", "ASC"]] });
  if (!owner) throw new HttpError(404, "No active owner for this shop");
  res.json({
    success: true,
    data: { token: signToken(owner), user: owner.toSafeJSON(), shop: shopPayload(shop, platform) },
  });
});

// DELETE /api/admin/shops/:id  { confirm: "<shop name>" } — drops the shop's database permanently
const deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  if (shop.id === req.shopId) throw new HttpError(400, "You cannot delete your own shop");
  if (String(req.body?.confirm || "").trim() !== shop.name) throw new HttpError(400, "Type the exact shop name to confirm deletion");
  const dbName = shop.dbName;
  await closeTenant(dbName);
  if (dbName) {
    assertSafeDbName(dbName);
    await master.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  }
  await User.destroy({ where: { shopId: shop.id } });
  await shop.destroy();
  summaryCache.delete(shop.id);
  res.json({ success: true, message: `"${shop.name}" and its database were deleted` });
});

// POST /api/admin/shops/:id/repair-db — re-create database / tables if missing
const repairDb = asyncHandler(async (req, res) => {
  const shop = await Shop.findByPk(req.params.id);
  if (!shop) throw new HttpError(404, "Shop not found");
  await closeTenant(shop.dbName);
  await createDatabaseIfMissing(shop.dbName);
  await getTenant(shop);
  summaryCache.delete(shop.id);
  res.json({ success: true, message: "Database verified" });
});

// GET /api/admin/settings
const getPlatform = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { settings: await getPlatformSettings(true) } });
});

// PUT /api/admin/settings
const updatePlatform = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const current = await getPlatformSettings(true);
  const next = { ...current };
  ["platformName", "tagline", "supportEmail", "supportPhone", "currencySymbol"].forEach((k) => {
    if (b[k] !== undefined) next[k] = String(b[k] ?? "").slice(0, 200);
  });
  if (b.allowSignup !== undefined) next.allowSignup = bool(b.allowSignup);
  if (b.trialDays !== undefined) next.trialDays = Math.max(1, Math.min(365, int(b.trialDays, 14)));
  if (b.defaultThemeMode !== undefined) next.defaultThemeMode = ["light", "dark", "system"].includes(b.defaultThemeMode) ? b.defaultThemeMode : "light";
  if (b.defaultAccentColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.defaultAccentColor)) next.defaultAccentColor = b.defaultAccentColor;
  if (b.plans && typeof b.plans === "object") {
    const plans = {};
    Object.entries(b.plans).forEach(([key, v]) => {
      if (!/^[a-z0-9_]{2,20}$/.test(key) || !v) return;
      plans[key] = {
        label: String(v.label || key).slice(0, 40),
        maxUsers: Math.max(0, int(v.maxUsers)),
        maxProducts: Math.max(0, int(v.maxProducts)),
        price: Math.max(0, num(v.price)),
      };
    });
    if (!plans.free) throw new HttpError(400, "The 'free' plan is required");
    next.plans = plans;
  }
  const [row] = await PlatformSetting.findOrCreate({ where: { id: 1 }, defaults: { id: 1, data: {} } });
  row.data = mergePlatform(next);
  await row.save();
  clearPlatformCache();
  res.json({ success: true, message: "Platform settings saved", data: { settings: await getPlatformSettings(true) } });
});

module.exports = {
  getStats,
  getShops,
  getShop,
  createShop,
  updateShop,
  toggleShop,
  resetPassword,
  loginAs,
  deleteShop,
  repairDb,
  getPlatform,
  updatePlatform,
};
