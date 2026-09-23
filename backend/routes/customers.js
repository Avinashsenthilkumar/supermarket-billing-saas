const router = require("express").Router();
const c = require("../controllers/customerController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect, requireActiveSubscription);

router.get("/", c.getCustomers);
router.get("/lookup", c.lookupCustomer);
router.post("/", c.createCustomer);
router.get("/:id", c.getCustomer);
router.put("/:id", c.updateCustomer);
router.delete("/:id", allow("owner", "manager"), c.deleteCustomer);
router.post("/:id/payments", c.receivePayment);
router.post("/:id/points", allow("owner", "manager"), c.adjustPoints);

module.exports = router;
