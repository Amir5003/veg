const express = require('express');
const router = express.Router();
const { getProducts, getProductById, addProduct } = require('../controllers/productController');

// Define routes for products
router.route('/').get(getProducts).post(addProduct);  // For fetching all products and adding a new product
router.route('/:id').get(getProductById);  // For fetching a product by ID

module.exports = router;
