const router = require("express").Router();
const c = require("../controllers/productController");
const { protect, allow, requireActiveSubscription } = require("../middleware/auth");

router.use(protect, requireActiveSubscription);
const staff = allow("owner", "manager");

router.get("/", c.getProducts);
router.get("/summary", c.getSummary);
router.get("/categories", c.getCategories);
router.get("/barcode/:barcode", c.getProductByBarcode);
router.post("/scan", staff, c.scanBarcode);
router.post("/bulk-import", staff, c.bulkImport);
router.post("/", staff, c.createProduct);
router.get("/:id", c.getProduct);
router.put("/:id", staff, c.updateProduct);
router.delete("/:id", staff, c.deleteProduct);
router.patch("/:id/restore", staff, c.restoreProduct);
router.patch("/:id/stock", staff, c.updateStock);
router.get("/:id/movements", staff, c.getMovements);

module.exports = router;
