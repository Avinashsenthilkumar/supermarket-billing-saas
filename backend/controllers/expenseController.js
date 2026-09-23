// controllers/expenseController.js — shop expenses (rent, salary, electricity …)
const { Op, fn, col } = require("sequelize");
const { asyncHandler, HttpError, num, str, round2, paging } = require("../utils/helpers");

const fields = (b) => ({
  category: str(b.category, 60) || "General",
  amount: round2(Math.max(0, num(b.amount))),
  expenseDate: b.expenseDate ? String(b.expenseDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
  paymentMethod: str(b.paymentMethod, 20) || "cash",
  paidTo: str(b.paidTo, 120),
  reference: str(b.reference, 80),
  notes: str(b.notes, 2000),
});

const getExpenses = asyncHandler(async (req, res) => {
  const db = req.db;
  const { page, limit, offset } = paging(req.query, 50, 500);
  const where = {};
  if (req.query.category) where.category = req.query.category;
  if (req.query.startDate || req.query.endDate) {
    where.expenseDate = {};
    if (req.query.startDate) where.expenseDate[Op.gte] = req.query.startDate;
    if (req.query.endDate) where.expenseDate[Op.lte] = req.query.endDate;
  }
  if (req.query.search) {
    const q = `%${String(req.query.search).trim()}%`;
    where[Op.or] = [{ paidTo: { [Op.like]: q } }, { notes: { [Op.like]: q } }, { category: { [Op.like]: q } }];
  }
  const { count, rows } = await db.Expense.findAndCountAll({ where, order: [["expenseDate", "DESC"], ["id", "DESC"]], limit, offset });
  const [total, byCategory] = await Promise.all([
    db.Expense.sum("amount", { where }),
    db.Expense.findAll({ where, attributes: ["category", [fn("SUM", col("amount")), "total"]], group: ["category"], raw: true }),
  ]);
  res.json({
    success: true,
    data: {
      expenses: rows,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
      summary: { totalAmount: round2(total), byCategory: byCategory.map((r) => ({ category: r.category, total: round2(r.total) })) },
    },
  });
});

const createExpense = asyncHandler(async (req, res) => {
  const data = fields(req.body || {});
  if (!(data.amount > 0)) throw new HttpError(400, "Enter a valid amount");
  const expense = await req.db.Expense.create({ ...data, createdBy: req.user.username });
  res.status(201).json({ success: true, message: "Expense recorded", data: { expense } });
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await req.db.Expense.findByPk(req.params.id);
  if (!expense) throw new HttpError(404, "Expense not found");
  const data = fields({ ...expense.get({ plain: true }), ...(req.body || {}) });
  if (!(data.amount > 0)) throw new HttpError(400, "Enter a valid amount");
  await expense.update(data);
  res.json({ success: true, message: "Expense updated", data: { expense } });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await req.db.Expense.findByPk(req.params.id);
  if (!expense) throw new HttpError(404, "Expense not found");
  await expense.destroy();
  res.json({ success: true, message: "Expense deleted" });
});

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
