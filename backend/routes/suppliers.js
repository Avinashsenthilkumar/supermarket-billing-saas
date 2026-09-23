const router = require("express").Router();
const c = require("../controllers/supplierController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect, requireActiveSubscription, allow("owner", "manager"));

router.get("/", c.getSuppliers);
router.post("/", c.createSupplier);
router.get("/:id", c.getSupplier);
router.put("/:id", c.updateSupplier);
router.delete("/:id", c.deleteSupplier);
router.post("/:id/payments", c.paySupplier);

module.exports = router;
