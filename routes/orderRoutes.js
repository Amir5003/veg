const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Define routes for order management
router.route('/').post(protect, createOrder);
router.route('/myorders').get(protect, getUserOrders);
router.route('/orderbyid').post(protect, getOrderById);
router.route('/status').post(protect, updateOrderStatus);

module.exports = router;
