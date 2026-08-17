// controllers/reportsController.js
const { Op, fn, col, literal, QueryTypes } = require("sequelize");
const { Bill, BillItem, Product, sequelize } = require("../models");

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const shopId = req.shopId;
    const today = getTodayRange();
    const month = getMonthRange();

    const todayBills = await Bill.findAll({
      where: { shopId, createdAt: { [Op.between]: [today.start, today.end] }, status: "completed" },
      attributes: [[fn("COUNT", col("id")), "count"], [fn("SUM", col("total_amount")), "revenue"]],
      raw: true,
    });

    const monthBills = await Bill.findAll({
      where: { shopId, createdAt: { [Op.between]: [month.start, month.end] }, status: "completed" },
      attributes: [[fn("COUNT", col("id")), "count"], [fn("SUM", col("total_amount")), "revenue"]],
      raw: true,
    });

    const allTimeBills = await Bill.findAll({
      where: { shopId, status: "completed" },
      attributes: [[fn("COUNT", col("id")), "count"], [fn("SUM", col("total_amount")), "revenue"]],
      raw: true,
    });

    const recentBills = await Bill.findAll({
      where: { shopId, status: "completed" },
      include: [{ model: BillItem, as: "items" }],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const lowStock = await Product.findAll({
      where: { shopId, quantity: { [Op.lt]: 10 }, isActive: true },
      order: [["quantity", "ASC"]],
      limit: 10,
    });

    const totalProducts = await Product.count({ where: { shopId, isActive: true } });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const result = await Bill.findOne({
        where: { shopId, createdAt: { [Op.between]: [dayStart, dayEnd] }, status: "completed" },
        attributes: [[fn("COUNT", col("id")), "count"], [fn("SUM", col("total_amount")), "revenue"]],
        raw: true,
      });

      last7Days.push({
        date: new Date(dayStart).toISOString().slice(0, 10),
        count: parseInt(result.count) || 0,
        revenue: parseFloat(result.revenue) || 0,
      });
    }

    res.json({
      success: true,
      data: {
        today: { bills: parseInt(todayBills[0]?.count) || 0, revenue: parseFloat(todayBills[0]?.revenue) || 0 },
        month: { bills: parseInt(monthBills[0]?.count) || 0, revenue: parseFloat(monthBills[0]?.revenue) || 0 },
        allTime: { bills: parseInt(allTimeBills[0]?.count) || 0, revenue: parseFloat(allTimeBills[0]?.revenue) || 0 },
        recentBills,
        lowStock,
        totalProducts,
        last7Days,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales report for a date range
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { shopId: req.shopId, status: "completed" };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    const bills = await Bill.findAll({
      where,
      include: [{ model: BillItem, as: "items" }],
      order: [["createdAt", "DESC"]],
    });

    const summary = {
      totalBills: bills.length,
      totalRevenue: bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0),
      totalItems: bills.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0),
      averageBillValue: bills.length
        ? bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0) / bills.length
        : 0,
    };

    res.json({ success: true, data: { summary, bills } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top selling products
// @route   GET /api/reports/top-products
// @access  Private
const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const billWhere = { shopId: req.shopId, status: "completed" };

    if (startDate || endDate) {
      billWhere.createdAt = {};
      if (startDate) billWhere.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        billWhere.createdAt[Op.lte] = end;
      }
    }

    const topProducts = await BillItem.findAll({
      attributes: [
        "productId",
        "productName",
        [fn("SUM", col("quantity")), "totalSold"],
        [fn("SUM", col("total_price")), "totalRevenue"],
        [fn("COUNT", col("BillItem.id")), "orderCount"],
      ],
      include: [{ model: Bill, as: "bill", where: billWhere, attributes: [] }],
      group: ["productId", "productName"],
      order: [[literal("totalSold"), "DESC"]],
      limit: parseInt(limit),
      raw: true,
    });

    res.json({ success: true, data: { topProducts } });
  } catch (error) {
    next(error);
  }
};

// @desc    Stock report (scoped to shop)
// @route   GET /api/reports/stock
// @access  Private
const getStockReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await sequelize.query(
      `
      SELECT
        p.id,
        p.name,
        p.barcode,
        p.category,
        p.price,
        p.quantity AS currentStock,
        COALESCE(SUM(
          CASE
            WHEN b.createdAt BETWEEN :startDate AND :endDate
            AND b.status='completed'
            THEN bi.quantity
            ELSE 0
          END
        ),0) AS soldQty
      FROM products p
      LEFT JOIN bill_items bi ON p.id = bi.product_id
      LEFT JOIN bills b ON bi.bill_id = b.id
      WHERE p.shop_id = :shopId
      GROUP BY p.id, p.name, p.barcode, p.category, p.price, p.quantity
      ORDER BY p.name ASC
      `,
      {
        replacements: { startDate, endDate, shopId: req.shopId },
        type: QueryTypes.SELECT,
      },
    );

    const data = report.map((item) => ({
      ...item,
      openingStock: Number(item.currentStock) + Number(item.soldQty),
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getSalesReport, getTopProducts, getStockReport };
