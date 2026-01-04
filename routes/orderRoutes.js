const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    getVendorOrders,
    updateVendorOrderStatus,
} = require('../controllers/orderController');
const { protect, vendorOnly } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id', protect, updateOrderStatus);

// Vendor routes
router.get('/vendor/orders', protect, vendorOnly, getVendorOrders);
router.put('/:id/vendor-status', protect, vendorOnly, updateVendorOrderStatus);

module.exports = router;
