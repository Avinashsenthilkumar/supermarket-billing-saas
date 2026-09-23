const router = require("express").Router();
const c = require("../controllers/expenseController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect, requireActiveSubscription, allow("owner", "manager"));

router.get("/", c.getExpenses);
router.post("/", c.createExpense);
router.put("/:id", c.updateExpense);
router.delete("/:id", c.deleteExpense);

module.exports = router;
