// routes/bills.js
const express = require('express');
const router = express.Router();
const { createBill, getBills, getBill, cancelBill } = require('../controllers/billingController');
const { generateInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getBills).post(createBill);
router.route('/:id').get(getBill);
router.patch('/:id/cancel', cancelBill);
router.get('/:id/invoice', generateInvoice);

module.exports = router;
