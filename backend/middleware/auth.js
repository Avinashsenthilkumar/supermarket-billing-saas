// middleware/auth.js
const jwt = require("jsonwebtoken");
const { User, Shop } = require("../models/master");
const { getTenant } = require("../tenant/tenantManager");

const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not configured");
  return s;
};

const signToken = (user) =>
  jwt.sign({ id: user.id, shopId: user.shopId }, JWT_SECRET(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const deny = (res, status, message, code) => res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

const isSuperAdminUser = (user) =>
  !!user &&
  (user.isSuperAdmin ||
    (process.env.SUPER_ADMIN_EMAIL && user.email === String(process.env.SUPER_ADMIN_EMAIL).toLowerCase()));

const subscriptionActive = (shop) => {
  if (!shop.subscriptionEnds) return true; // no end date = lifetime
  return new Date(shop.subscriptionEnds).getTime() >= Date.now();
};

/**
 * Verifies the JWT, loads the user + shop from the MASTER db and attaches the
 * shop's private database handle as `req.db` (models) / `req.tenant`.
 */
const protect = async (req, res, next) => {
  let decoded;
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return deny(res, 401, "Not authorized, no token");
    decoded = jwt.verify(token, JWT_SECRET());
  } catch {
    return deny(res, 401, "Session expired, please login again");
  }

  try {
    const user = await User.findByPk(decoded.id, { include: [{ model: Shop, as: "shop" }] });
    if (!user || !user.isActive) return deny(res, 401, "User not found or inactive");
    if (!user.shop) return deny(res, 403, "Shop not found");

    const superAdmin = isSuperAdminUser(user);
    if (!user.shop.isActive && !superAdmin) return deny(res, 403, "Your shop is inactive. Contact support.", "SHOP_INACTIVE");

    req.user = user;
    req.shop = user.shop;
    req.shopId = user.shopId;
    req.isSuperAdmin = superAdmin;
    req.subscriptionActive = superAdmin || subscriptionActive(user.shop);

    const tenant = await getTenant(user.shop);
    req.tenant = tenant;
    req.db = tenant.models;
    next();
  } catch (err) {
    next(err);
  }
};

// Block every write (POST/PUT/PATCH/DELETE) when the plan/trial has expired.
const requireActiveSubscription = (req, res, next) => {
  if (req.method === "GET" || req.subscriptionActive) return next();
  return deny(res, 402, "Your subscription / trial has expired. Please renew to continue.", "SUBSCRIPTION_EXPIRED");
};

// allow('owner','manager') → only these shop roles may continue
const allow = (...roles) => (req, res, next) => {
  if (req.isSuperAdmin || roles.includes(req.user.role)) return next();
  return deny(res, 403, "You don't have permission to do this");
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.isSuperAdmin) return deny(res, 403, "Platform admin access only");
  next();
};

module.exports = { protect, requireActiveSubscription, allow, requireSuperAdmin, signToken, isSuperAdminUser, subscriptionActive };
