// controllers/billingController.js
const { Op } = require('sequelize');
const { Bill, BillItem, Product, sequelize } = require('../models');

// Generate unique bill number (scoped display per shop via shopId column)
const generateBillNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const time = Date.now().toString().slice(-6);
  return `BILL-${dateStr}-${time}`;
};

// @desc    Create a new bill
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items, paymentMethod, customerName, customerPhone, taxRate = 0, discountAmount = 0, notes } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Bill must have at least one item' });
    }

    const billItemsData = [];
    let subtotal = 0;

    for (const item of items) {
      // scope product lookup to this shop
      const product = await Product.findOne({
        where: { id: item.productId, shopId: req.shopId },
        transaction: t,
      });
      if (!product || !product.isActive) {
        await t.rollback();
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }
      if (product.quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
        });
      }

      const totalPrice = parseFloat(product.price) * item.quantity;
      subtotal += totalPrice;

      billItemsData.push({
        productId: product.id,
        productName: product.name,
        productBarcode: product.barcode,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice,
      });

      await product.update({ quantity: product.quantity - item.quantity }, { transaction: t });
    }

    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - parseFloat(discountAmount || 0);

    const bill = await Bill.create({
      shopId: req.shopId,
      billNumber: generateBillNumber(),
      subtotal,
      taxRate,
      taxAmount,
      discountAmount: discountAmount || 0,
      totalAmount,
      paymentMethod,
      customerName,
      customerPhone,
      notes,
      status: 'completed',
    }, { transaction: t });

    const billItems = billItemsData.map((item) => ({ ...item, billId: bill.id }));
    await BillItem.bulkCreate(billItems, { transaction: t });

    await t.commit();

    const fullBill = await Bill.findByPk(bill.id, {
      include: [{ model: BillItem, as: 'items' }],
    });

    res.status(201).json({ success: true, message: 'Bill created successfully', data: { bill: fullBill } });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// @desc    Get all bills with pagination
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;
    const offset = (page - 1) * limit;
    const where = { shopId: req.shopId };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    const { count, rows } = await Bill.findAndCountAll({
      where,
      include: [{ model: BillItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: { bills: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private
const getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      where: { id: req.params.id, shopId: req.shopId },
      include: [{ model: BillItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.json({ success: true, data: { bill } });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a bill and restore stock
// @route   PATCH /api/bills/:id/cancel
// @access  Private
const cancelBill = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const bill = await Bill.findOne({
      where: { id: req.params.id, shopId: req.shopId },
      include: [{ model: BillItem, as: 'items' }],
      transaction: t,
    });

    if (!bill) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.status !== 'completed') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Only completed bills can be cancelled' });
    }

    for (const item of bill.items) {
      const product = await Product.findOne({
        where: { id: item.productId, shopId: req.shopId },
        transaction: t,
      });
      if (product) {
        await product.update({ quantity: product.quantity + item.quantity }, { transaction: t });
      }
    }

    await bill.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();

    res.json({ success: true, message: 'Bill cancelled and stock restored' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = { createBill, getBills, getBill, cancelBill };
