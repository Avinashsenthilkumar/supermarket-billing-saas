const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getSalesReport,
  getTopProducts,
  getStockReport,
} = require("../controllers/reportsController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/sales", getSalesReport);
router.get("/top-products", getTopProducts);

// NEW
router.get("/stock", getStockReport);

module.exports = router;
