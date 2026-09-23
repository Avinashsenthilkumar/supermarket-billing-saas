const router = require("express").Router();
const c = require("../controllers/settingsController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect);
router.get("/", c.getSettings);
router.put("/", requireActiveSubscription, allow("owner"), c.updateSettings);
router.post("/reset-appearance", requireActiveSubscription, allow("owner"), c.resetAppearance);

module.exports = router;
