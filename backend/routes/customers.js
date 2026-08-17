const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const {
  getCustomers,
  getCustomerDetails,
} = require("../controllers/customerController");

router.use(protect);

router.get("/", getCustomers);
router.get("/:phone", getCustomerDetails);

module.exports = router;
