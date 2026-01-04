const express = require('express');
const router = express.Router();
const { protect, vendorOnly, vendorOwnsProduct } = require('../middleware/authMiddleware');
const {
    getVendorProfile,
    updateVendorProfile,
    updateBankDetails,
    getVendorDashboard,
    getVendorOrders,
    updateVendorOrderStatus,
    getVendorEarnings,
    requestPayout,
    getVendorReviews,
} = require('../controllers/vendorController');

// Protected vendor routes
router.use(protect, vendorOnly);

router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);
router.put('/bank-details', updateBankDetails);
router.get('/dashboard', getVendorDashboard);
router.get('/orders', getVendorOrders);
router.put('/orders/:orderId/status', updateVendorOrderStatus);
router.get('/earnings', getVendorEarnings);
router.post('/payout-request', requestPayout);
router.get('/reviews', getVendorReviews);

module.exports = router;
