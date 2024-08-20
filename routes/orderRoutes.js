const express = require('express');
const { addOrder, getOrderById, getOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, addOrder);
router.get('/:id', protect, getOrderById);
router.get('/', protect, getOrders);

module.exports = router;
