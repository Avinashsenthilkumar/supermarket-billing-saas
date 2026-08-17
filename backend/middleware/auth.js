// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Shop } = require('../models');

// Verify JWT, attach user + shop to request
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Shop, as: 'shop' }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    if (!user.shop || !user.shop.isActive) {
      return res.status(403).json({ success: false, message: 'Shop is inactive. Contact support.' });
    }

    req.user = user;
    req.shopId = user.shopId; // convenience shortcut used by controllers
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Optional: block access when the subscription has expired.
// Free trial = subscriptionEnds in the future. Apply this only to routes
// you want to gate (e.g. billing). Leave read-only routes ungated if you like.
const requireActiveSubscription = (req, res, next) => {
  const shop = req.user.shop;
  const ends = shop.subscriptionEnds ? new Date(shop.subscriptionEnds) : null;
  if (!ends || ends.getTime() < Date.now()) {
    return res.status(402).json({
      success: false,
      message: 'Your subscription/trial has expired. Please upgrade to continue.',
      code: 'SUBSCRIPTION_EXPIRED',
    });
  }
  next();
};

// Only shop owners can perform certain actions (e.g. manage staff)
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, message: 'Owner access required' });
  }
  next();
};

// Super-admin: identified by email (set SUPER_ADMIN_EMAIL in env)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@supermarket.com';
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.email !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

module.exports = { protect, requireActiveSubscription, requireOwner, requireSuperAdmin };
