const express = require('express');
const router = express.Router();
const { addToCart, removeFromCart, getCart, updateCartQuantity, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Define routes for cart management (Customer only)
router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.delete('/remove', protect, removeFromCart);
router.put('/update', protect, updateCartQuantity);
router.delete('/', protect, clearCart);

module.exports = router;
