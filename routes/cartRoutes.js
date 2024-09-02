const express = require('express');
const router = express.Router();
const { addToCart, removeFromCart, getCart, updateCartQuantity } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Define routes for cart management
router.route('/').get(protect, getCart);
router.route('/add').post(protect, addToCart);
router.route('/remove').post(protect, removeFromCart);
router.route('/update').post(protect, updateCartQuantity);

module.exports = router;
