const router = require("express").Router();
const c = require("../controllers/purchaseController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect, requireActiveSubscription, allow("owner", "manager"));

router.get("/", c.getPurchases);
router.post("/", c.createPurchase);
router.get("/:id", c.getPurchase);
router.patch("/:id/cancel", c.cancelPurchase);

module.exports = router;
