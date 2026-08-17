// routes/products.js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateStock,
  scanBarcode,
  deleteProduct,
  getCategories,
  bulkImport,
} = require("../controllers/productController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/categories", getCategories);
router.get("/barcode/:barcode", getProductByBarcode);
router.post("/scan", scanBarcode);
router.post("/bulk-import", bulkImport);

router.route("/").get(getProducts).post(createProduct);

router.route("/:id").get(getProduct).put(updateProduct).delete(deleteProduct);

router.patch("/:id/stock", updateStock);

module.exports = router;
