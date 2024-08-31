const express = require('express');
const router = express.Router();
const { getProducts, getProductById, addProduct } = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

// Define routes for products
router.route('/').get(protect, getProducts).post(protect, addProduct);  // For fetching all products and adding a new product
router.route('/:id').get(protect, getProductById);  // For fetching a product by ID

module.exports = router;
