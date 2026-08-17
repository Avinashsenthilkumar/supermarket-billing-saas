// controllers/authController.js
const jwt = require('jsonwebtoken');
const { sequelize, User, Shop } = require('../models');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '14', 10);

// @desc    Register a new shop + owner account (SaaS signup)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { shopName, username, email, password, phone } = req.body;

    if (!shopName || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Shop name, email and password are required',
      });
    }

    // Email must be globally unique (it is the login id)
    const existing = await User.findOne({ where: { email }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // 1) Create the shop (tenant) with a free trial
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

    const shop = await Shop.create({
      name: shopName,
      ownerEmail: email,
      phone: phone || null,
      plan: 'free',
      subscriptionEnds: trialEnds,
      isActive: true,
    }, { transaction: t });

    // 2) Create the owner user inside that shop
    const user = await User.create({
      shopId: shop.id,
      username: username || 'owner',
      email,
      password,
      role: 'owner',
    }, { transaction: t });

    await t.commit();

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, shopId: shop.id },
        shop: { id: shop.id, name: shop.name, plan: shop.plan, subscriptionEnds: shop.subscriptionEnds },
      },
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Shop, as: 'shop' }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.shop || !user.shop.isActive) {
      return res.status(403).json({ success: false, message: 'Shop is inactive. Contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, shopId: user.shopId },
        shop: {
          id: user.shop.id,
          name: user.shop.name,
          plan: user.shop.plan,
          subscriptionEnds: user.shop.subscriptionEnds,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          shopId: req.user.shopId,
        },
        shop: req.user.shop
          ? {
              id: req.user.shop.id,
              name: req.user.shop.name,
              plan: req.user.shop.plan,
              subscriptionEnds: req.user.shop.subscriptionEnds,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword };
