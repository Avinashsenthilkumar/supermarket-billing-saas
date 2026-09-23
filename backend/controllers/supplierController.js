// controllers/supplierController.js — suppliers / vendors and payables
const { Op } = require("sequelize");
const { asyncHandler, HttpError, num, str, round2, paging } = require("../utils/helpers");

const supplierFields = (b) => ({
  name: str(b.name, 150),
  contactPerson: str(b.contactPerson, 100),
  phone: str(b.phone, 20),
  email: str(b.email, 120),
  gstNumber: str(b.gstNumber, 20),
  address: str(b.address, 1000),
  notes: str(b.notes, 2000),
});

const getSuppliers = asyncHandler(async (req, res) => {
  const db = req.db;
  const { page, limit, offset } = paging(req.query, 100, 1000);
  const where = { isActive: true };
  if (req.query.search) {
    const q = `%${String(req.query.search).trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: q } }, { phone: { [Op.like]: q } }, { contactPerson: { [Op.like]: q } }];
  }
  const { count, rows } = await db.Supplier.findAndCountAll({ where, order: [["name", "ASC"]], limit, offset });
  const totalPayable = await db.Supplier.sum("balance", { where: { isActive: true, balance: { [Op.gt]: 0 } } });
  res.json({ success: true, data: { suppliers: rows, total: count, page, pages: Math.max(1, Math.ceil(count / limit)), summary: { totalPayable: round2(totalPayable) } } });
});

const getSupplier = asyncHandler(async (req, res) => {
  const db = req.db;
  const supplier = await db.Supplier.findByPk(req.params.id);
  if (!supplier) throw new HttpError(404, "Supplier not found");
  const [purchases, payments, productCount] = await Promise.all([
    db.Purchase.findAll({ where: { supplierId: supplier.id }, order: [["purchaseDate", "DESC"], ["id", "DESC"]], limit: 200 }),
    db.SupplierPayment.findAll({ where: { supplierId: supplier.id }, order: [["createdAt", "DESC"]], limit: 200 }),
    db.Product.count({ where: { supplierId: supplier.id, isActive: true } }),
  ]);
  res.json({ success: true, data: { supplier, purchases, payments, productCount } });
});

const createSupplier = asyncHandler(async (req, res) => {
  const data = supplierFields(req.body || {});
  if (!data.name) throw new HttpError(400, "Supplier name is required");
  const opening = round2(Math.max(0, num(req.body?.openingBalance)));
  const supplier = await req.db.Supplier.create({ ...data, balance: opening });
  res.status(201).json({ success: true, message: "Supplier added", data: { supplier } });
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await req.db.Supplier.findByPk(req.params.id);
  if (!supplier) throw new HttpError(404, "Supplier not found");
  const data = supplierFields({ ...supplier.get({ plain: true }), ...(req.body || {}) });
  if (!data.name) throw new HttpError(400, "Supplier name is required");
  await supplier.update(data);
  res.json({ success: true, message: "Supplier updated", data: { supplier } });
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await req.db.Supplier.findByPk(req.params.id);
  if (!supplier) throw new HttpError(404, "Supplier not found");
  if (Number(supplier.balance) > 0) throw new HttpError(400, "This supplier still has a pending balance");
  await supplier.update({ isActive: false });
  res.json({ success: true, message: "Supplier removed" });
});

// POST /api/suppliers/:id/payments  { amount, method, reference, notes, purchaseId? }
const paySupplier = asyncHandler(async (req, res) => {
  const db = req.db;
  const amount = round2(num(req.body?.amount));
  if (!(amount > 0)) throw new HttpError(400, "Enter a valid amount");
  const method = ["cash", "upi", "card", "bank", "cheque", "other"].includes(req.body?.method) ? req.body.method : "cash";
  const t = await req.tenant.sequelize.transaction();
  try {
    const supplier = await db.Supplier.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!supplier) throw new HttpError(404, "Supplier not found");
    const payment = await db.SupplierPayment.create(
      {
        supplierId: supplier.id,
        purchaseId: req.body?.purchaseId || null,
        amount,
        method,
        reference: str(req.body?.reference, 80),
        notes: str(req.body?.notes, 255),
        createdBy: req.user.username,
      },
      { transaction: t },
    );
    // settle oldest purchase dues first
    let remaining = amount;
    const where = { supplierId: supplier.id, dueAmount: { [Op.gt]: 0 }, status: "completed" };
    if (req.body?.purchaseId) where.id = req.body.purchaseId;
    const due = await db.Purchase.findAll({ where, order: [["purchaseDate", "ASC"], ["id", "ASC"]], transaction: t, lock: t.LOCK.UPDATE });
    for (const p of due) {
      if (remaining <= 0) break;
      const part = round2(Math.min(remaining, Number(p.dueAmount)));
      p.dueAmount = round2(Number(p.dueAmount) - part);
      p.paidAmount = round2(Number(p.paidAmount) + part);
      await p.save({ transaction: t });
      remaining = round2(remaining - part);
    }
    supplier.balance = round2(Number(supplier.balance) - amount);
    await supplier.save({ transaction: t });
    await t.commit();
    res.status(201).json({ success: true, message: "Payment recorded", data: { supplier, payment } });
  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
});

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, paySupplier };
