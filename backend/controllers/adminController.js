// controllers/adminController.js — super-admin only (manage all tenants)
const { fn, col } = require('sequelize');
const { sequelize, Shop, User, Product, Bill } = require('../models');

// GET /api/admin/stats — platform overview
const getStats = async (req, res, next) => {
  try {
    const totalShops = await Shop.count();
    const activeShops = await Shop.count({ where: { isActive: true } });
    const totalUsers = await User.count();
    const totalProducts = await Product.count();
    const totalBills = await Bill.count();
    const revenueRow = await Bill.findAll({
      where: { status: 'completed' },
      attributes: [[fn('SUM', col('total_amount')), 'revenue']],
      raw: true,
    });
    res.json({
      success: true,
      data: {
        totalShops,
        activeShops,
        inactiveShops: totalShops - activeShops,
        totalUsers,
        totalProducts,
        totalBills,
        totalRevenue: parseFloat(revenueRow[0]?.revenue) || 0,
      },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/shops — every shop with counts
const getShops = async (req, res, next) => {
  try {
    const shops = await Shop.findAll({ order: [['createdAt', 'DESC']] });
    const data = await Promise.all(
      shops.map(async (s) => {
        const users = await User.count({ where: { shopId: s.id } });
        const products = await Product.count({ where: { shopId: s.id } });
        const bills = await Bill.count({ where: { shopId: s.id } });
        return {
          id: s.id,
          name: s.name,
          ownerEmail: s.ownerEmail,
          phone: s.phone,
          plan: s.plan,
          isActive: s.isActive,
          subscriptionEnds: s.subscriptionEnds,
          createdAt: s.createdAt,
          users,
          products,
          bills,
        };
      })
    );
    res.json({ success: true, data: { shops: data } });
  } catch (e) { next(e); }
};

// POST /api/admin/shops — admin creates a shop + owner
const createShop = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { shopName, ownerEmail, username, password, phone, plan } = req.body;
    if (!shopName || !ownerEmail || !password) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Shop name, owner email and password are required' });
    }
    const exists = await User.findOne({ where: { email: ownerEmail }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 365);
    const shop = await Shop.create({
      name: shopName,
      ownerEmail,
      phone: phone || null,
      plan: plan || 'free',
      subscriptionEnds: trialEnds,
      isActive: true,
    }, { transaction: t });
    await User.create({
      shopId: shop.id,
      username: username || 'owner',
      email: ownerEmail,
      password,
      role: 'owner',
    }, { transaction: t });
    await t.commit();
    res.status(201).json({ success: true, message: 'Shop created', data: { shopId: shop.id } });
  } catch (e) { await t.rollback(); next(e); }
};

// PATCH /api/admin/shops/:id/toggle — activate / deactivate a shop
const toggleShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    if (shop.id === 1) return res.status(400).json({ success: false, message: 'Cannot deactivate the default shop' });
    await shop.update({ isActive: !shop.isActive });
    res.json({ success: true, message: shop.isActive ? 'Shop activated' : 'Shop deactivated', data: { isActive: shop.isActive } });
  } catch (e) { next(e); }
};

module.exports = { getStats, getShops, createShop, toggleShop };
