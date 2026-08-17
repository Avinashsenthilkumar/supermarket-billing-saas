// routes/admin.js
const express = require('express');
const router = express.Router();
const { protect, requireSuperAdmin } = require('../middleware/auth');
const { getStats, getShops, createShop, toggleShop } = require('../controllers/adminController');

router.use(protect, requireSuperAdmin); // every admin route is gated

router.get('/stats', getStats);
router.get('/shops', getShops);
router.post('/shops', createShop);
router.patch('/shops/:id/toggle', toggleShop);

module.exports = router;
