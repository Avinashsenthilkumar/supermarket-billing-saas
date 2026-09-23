// controllers/authController.js
const { User, Shop } = require("../models/master");
const { signToken, isSuperAdminUser } = require("../middleware/auth");
const { asyncHandler, HttpError, str } = require("../utils/helpers");
const { getPlatformSettings } = require("../utils/settings");
const { shopPayload } = require("../utils/shopPayload");
const { createShopWithOwner } = require("../utils/shopService");

const sessionPayload = async (user, shop) => {
  const platform = await getPlatformSettings();
  const superAdmin = isSuperAdminUser(user);
  return {
    user: { ...user.toSafeJSON(), isSuperAdmin: superAdmin },
    shop: shopPayload(shop, platform, superAdmin),
  };
};

// POST /api/auth/register — public SaaS signup (creates business + owner + private DB)
const register = asyncHandler(async (req, res) => {
  const platform = await getPlatformSettings();
  if (!platform.allowSignup) throw new HttpError(403, "New signups are currently closed. Contact the administrator.");

  const { shopName, username, email, password, phone, address, businessType } = req.body || {};
  const { shop, user } = await createShopWithOwner({ shopName, username, email, password, phone, address, businessType });
  const token = signToken(user);
  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { token, ...(await sessionPayload(user, shop)) },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = req.body?.password;
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const user = await User.findOne({ where: { email }, include: [{ model: Shop, as: "shop" }] });
  if (!user || !(await user.comparePassword(password))) throw new HttpError(401, "Invalid email or password");
  if (!user.isActive) throw new HttpError(403, "Your account is disabled. Contact your shop owner.");
  if (!user.shop) throw new HttpError(403, "Shop not found");
  if (!user.shop.isActive && !isSuperAdminUser(user)) throw new HttpError(403, "Your shop is inactive. Contact support.");

  user.lastLoginAt = new Date();
  await user.save({ fields: ["lastLoginAt"] });

  res.json({
    success: true,
    message: "Login successful",
    data: { token: signToken(user), ...(await sessionPayload(user, user.shop)) },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await sessionPayload(req.user, req.shop) });
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const username = str(req.body?.username, 60);
  const phone = str(req.body?.phone, 20);
  if (!username) throw new HttpError(400, "Name is required");
  const user = await User.findByPk(req.user.id);
  user.username = username;
  user.phone = phone;
  await user.save();
  res.json({ success: true, message: "Profile updated", data: { user: { ...user.toSafeJSON(), isSuperAdmin: req.isSuperAdmin } } });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) throw new HttpError(400, "Both passwords are required");
  if (String(newPassword).length < 6) throw new HttpError(400, "New password must be at least 6 characters");
  const user = await User.findByPk(req.user.id);
  if (!(await user.comparePassword(currentPassword))) throw new HttpError(400, "Current password is incorrect");
  user.password = String(newPassword);
  await user.save();
  res.json({ success: true, message: "Password updated successfully" });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
